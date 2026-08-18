import React, { useState, useEffect, useRef } from 'react';
import {
  Wrench,
  Camera,
  Upload,
  X,
  Plus,
  Trash2,
  FileCheck,
  Save,
  FileDown,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Mail,
  Send,
  Loader2,
  ArrowRight,
  Eye,
} from 'lucide-react';
import {
  Cinema,
  Sala,
  User,
  EquipmentCategory,
  EquipmentMaintenanceItem,
  EquipmentStatus,
  MaintenanceReport,
  MaintenanceType,
  EquipmentModel,
} from '../types';
import {
  getCinemas,
  getSalas,
  saveSala,
  getEquipmentModels,
  getCompanyConfig,
  getUsers,
  saveReport,
  addActivityLog,
} from '../services/storageService';
import { SignaturePad } from './SignaturePad';
import { CalibraCineLogo } from './CalibraCineLogo';
import { generateReportPDF, generateReportPDFBase64 } from '../utils/pdfGenerator';
import { compressImageFile } from '../utils/imageOptimizer';

interface NewMaintenanceViewProps {
  currentUser: User | null;
  onReportSubmitted: (report: MaintenanceReport) => void;
  onCancel: () => void;
}

export const NewMaintenanceView: React.FC<NewMaintenanceViewProps> = ({
  currentUser,
  onReportSubmitted,
  onCancel,
}) => {
  const cinemas = getCinemas();
  const allSalas = getSalas();
  const availableModels = getEquipmentModels();
  const activeUsers = getUsers().filter((u) => u.status === 'ativo');
  const company = getCompanyConfig();

  // Basic info state - Default to currently logged in user if available
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>(currentUser?.id || '');
  const [technicianName, setTechnicianName] = useState<string>(currentUser?.name || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
  const [selectedCinemaId, setSelectedCinemaId] = useState<string>('');
  const [filteredSalas, setFilteredSalas] = useState<Sala[]>([]);
  const [selectedSalaId, setSelectedSalaId] = useState<string>('');
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>('Preventiva');
  const [generalDescription, setGeneralDescription] = useState('');
  const [observations, setObservations] = useState('');

  // Photos state & compression progress
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoCaptions, setPhotoCaptions] = useState<string[]>([]);
  const [isCompressingPhotos, setIsCompressingPhotos] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Automatic Email Dispatch state
  const [autoEmailStatus, setAutoEmailStatus] = useState<{
    sending: boolean;
    success: boolean;
    error: string | null;
    previewUrl: string | null;
    isEthereal: boolean;
    recipient: string;
  }>({
    sending: false,
    success: false,
    error: null,
    previewUrl: null,
    isEthereal: false,
    recipient: '',
  });

  // Category checkboxes
  const [selectedCategories, setSelectedCategories] = useState<Record<EquipmentCategory, boolean>>({
    projetor: true,
    servidor: false,
    processador: false,
    automacao: false,
    outros: false,
  });

  // Equipment maintenance items
  const [equipmentItems, setEquipmentItems] = useState<EquipmentMaintenanceItem[]>([
    {
      id: `item-${Date.now()}-1`,
      category: 'projetor',
      model: availableModels.find((m) => m.category === 'projetor')?.model || 'Barco SP4K',
      assetNumber: '',
      serialNumber: '',
      description: '',
      partsReplaced: '',
      timeSpentMinutes: 30,
      status: 'Funcionando',
    },
  ]);

  // Digital Signature State
  const [digitalSignature, setDigitalSignature] = useState<string>('');

  // Filter available models specifically for the selected cinema (or global models)
  const cinemaModels = availableModels.filter(
    (m) => !m.cinemaId || m.cinemaId === selectedCinemaId
  );

  // Submission alert state
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReportModal, setSubmittedReportModal] = useState<MaintenanceReport | null>(null);

  // Update filtered salas whenever selected cinema changes (Guarantees options for Sala 1 to 10)
  useEffect(() => {
    if (selectedCinemaId) {
      const cinemaSalasInStorage = allSalas.filter((s) => s.cinemaId === selectedCinemaId);
      const options: Sala[] = [];

      for (let num = 1; num <= 10; num++) {
        const foundInStorage = cinemaSalasInStorage.find(
          (s) => s.number === num || s.name === `Sala ${num}` || s.name === `Sala ${num < 10 ? '0' + num : num}`
        );
        if (foundInStorage) {
          options.push(foundInStorage);
        } else {
          options.push({
            id: `sala-${selectedCinemaId}-${num}`,
            cinemaId: selectedCinemaId,
            number: num,
            name: `Sala ${num < 10 ? '0' + num : num}`,
            type: 'Convencional',
            createdAt: new Date().toISOString(),
          });
        }
      }

      setFilteredSalas(options);
      setSelectedSalaId('');
    } else {
      setFilteredSalas([]);
      setSelectedSalaId('');
    }
  }, [selectedCinemaId]);

  // Validation function for Step 1
  const validateStep1 = (): boolean => {
    if (!selectedTechnicianId) {
      setValidationError('A seleção do Técnico Responsável é obrigatória.');
      return false;
    }
    if (selectedTechnicianId === 'outro' && !technicianName.trim()) {
      setValidationError('Por favor, digite o nome do técnico responsável.');
      return false;
    }
    if (!selectedCinemaId) {
      setValidationError('A seleção do Cinema é obrigatória.');
      return false;
    }
    if (!selectedSalaId) {
      setValidationError('A seleção da Sala é obrigatória.');
      return false;
    }
    setValidationError('');
    return true;
  };

  // Automatic Email Dispatcher function
  const sendAutomaticReportEmail = async (report: MaintenanceReport) => {
    const company = getCompanyConfig();
    const currentCinema = cinemas.find((c) => c.id === report.cinemaId);

    // Build list of valid recipients: Company/Admin + Cinema Email + Technician
    const recipientsList: string[] = [];
    if (company.email && !company.email.includes('calibracine.com')) {
      recipientsList.push(company.email.trim());
    }
    if (currentCinema?.email && currentCinema.email.trim()) {
      recipientsList.push(currentCinema.email.trim());
    }
    if (currentUser?.email && currentUser.email.trim()) {
      recipientsList.push(currentUser.email.trim());
    }

    // Default fallback
    if (recipientsList.length === 0) {
      recipientsList.push(company.email || 'ronald.ramos001@gmail.com');
    }

    const uniqueRecipients = Array.from(new Set(recipientsList));
    const recipientEmail = uniqueRecipients.join(', ');

    setAutoEmailStatus({
      sending: true,
      success: false,
      error: null,
      previewUrl: null,
      isEthereal: false,
      recipient: recipientEmail,
    });

    try {
      // 1. Generate PDF in Base64 (guaranteed 5s safety race cap in generateReportPDFBase64)
      const pdfBase64 = await generateReportPDFBase64(report, company);

      // 2. Dispatch email with strict 8s timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          recipientEmail,
          reportId: report.id,
          cinemaName: report.cinemaName,
          salaName: report.salaName,
          technicianName: report.technicianName,
          date: report.date,
          time: report.time,
          maintenanceType: report.maintenanceType,
          generalDescription: report.generalDescription,
          equipmentCount: report.equipmentItems?.length || 0,
          pdfBase64,
          smtpConfig: company.smtp,
          companyEmail: company.email,
          companyName: company.name,
        }),
      });

      clearTimeout(timeoutId);
      const data = await response.json().catch(() => ({ success: false, error: 'Resposta inválida do servidor' }));

      if (response.ok && data.success) {
        setAutoEmailStatus({
          sending: false,
          success: true,
          error: null,
          previewUrl: data.previewUrl || null,
          isEthereal: Boolean(data.isEthereal),
          recipient: recipientEmail,
        });

        addActivityLog(
          'ENVIAR_EMAIL_AUTOMATICO',
          `E-mail automático enviado com PDF do relatório ${report.id} para ${recipientEmail}`,
          currentUser
        );
      } else {
        setAutoEmailStatus({
          sending: false,
          success: false,
          error: data.error || 'Não foi possível concluir o envio do e-mail no momento.',
          previewUrl: null,
          isEthereal: false,
          recipient: recipientEmail,
        });
      }
    } catch (err: any) {
      console.error('Auto email dispatch error:', err);
      const isTimeout = err?.name === 'AbortError';
      setAutoEmailStatus({
        sending: false,
        success: false,
        error: isTimeout
          ? 'Tempo limite de envio de e-mail atingido. O relatório já foi salvo no sistema e você pode baixar o PDF abaixo.'
          : (err?.message || 'Falha ao conectar com o serviço de envio de e-mail.'),
        previewUrl: null,
        isEthereal: false,
        recipient: recipientEmail,
      });
    }
  };

  // Handle Category Checkbox Toggle
  const handleCategoryToggle = (cat: EquipmentCategory) => {
    const isNowChecked = !selectedCategories[cat];
    setSelectedCategories((prev) => ({ ...prev, [cat]: isNowChecked }));

    if (isNowChecked) {
      // Add a default item block for this category
      const defaultModel = availableModels.find((m) => m.category === cat)?.model || 'Modelo Genérico';
      setEquipmentItems((prev) => [
        ...prev,
        {
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          category: cat,
          model: defaultModel,
          assetNumber: '',
          serialNumber: '',
          description: '',
          partsReplaced: '',
          timeSpentMinutes: 30,
          status: 'Funcionando',
        },
      ]);
    } else {
      // Remove all items for this category
      setEquipmentItems((prev) => prev.filter((item) => item.category !== cat));
    }
  };

  // Add another item block for a specific category
  const handleAddEquipmentBlock = (cat: EquipmentCategory) => {
    const defaultModel = availableModels.find((m) => m.category === cat)?.model || 'Modelo Customizado';
    setEquipmentItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        category: cat,
        model: defaultModel,
        assetNumber: '',
        serialNumber: '',
        description: '',
        partsReplaced: '',
        timeSpentMinutes: 30,
        status: 'Funcionando',
      },
    ]);
  };

  // Remove individual equipment item block
  const handleRemoveEquipmentBlock = (id: string) => {
    setEquipmentItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Update equipment item field
  const handleUpdateItemField = (id: string, field: keyof EquipmentMaintenanceItem, value: any) => {
    setEquipmentItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Photo Upload Handler (Camera, Gallery, Drag-Drop) with automatic high-speed compression
  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const currentPhotos = [...photos];
    const remainingSlot = 20 - currentPhotos.length;

    if (remainingSlot <= 0) {
      alert('Limite máximo de 20 fotos atingido para este relatório.');
      return;
    }

    const fileArray = Array.from(files).slice(0, remainingSlot);
    setIsCompressingPhotos(true);

    try {
      // Compress all images in parallel to lightweight web format
      const compressedList = await Promise.all(
        fileArray.map((file) => compressImageFile(file, 1024, 0.78))
      );
      setPhotos((prev) => [...prev, ...compressedList]);
    } catch (err) {
      console.error('Error optimizing photos:', err);
      // Fallback
      fileArray.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            setPhotos((prev) => [...prev, reader.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    } finally {
      setIsCompressingPhotos(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove individual photo and its caption
  const handleRemovePhoto = (indexToRemove: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setPhotoCaptions((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Update photo observation / caption
  const handleUpdatePhotoCaption = (index: number, caption: string) => {
    setPhotoCaptions((prev) => {
      const updated = [...prev];
      updated[index] = caption;
      return updated;
    });
  };

  // Drag & Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handlePhotoUpload(e.dataTransfer.files);
  };

  // Form Submission
  const handleSubmitReport = async (asDraft: boolean = false) => {
    setValidationError('');

    const currentCinema = cinemas.find((c) => c.id === selectedCinemaId);
    const currentSala = allSalas.find((s) => s.id === selectedSalaId) || filteredSalas.find((s) => s.id === selectedSalaId);

    if (!currentCinema) {
      setValidationError('Selecione um Cinema válido na etapa 1 (Dados gerais).');
      return;
    }

    if (!currentSala) {
      setValidationError('Selecione uma Sala válida na etapa 1 (Dados gerais).');
      return;
    }

    if (!asDraft && equipmentItems.length === 0) {
      setValidationError('Adicione ao menos um equipamento na etapa 2 antes de finalizar.');
      return;
    }

    setIsSubmitting(true);

    const finalTechName = technicianName.trim() || currentUser?.name || 'Técnico Responsável';
    const reportId = `CMM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newReport: MaintenanceReport = {
      id: reportId,
      technicianId: currentUser?.id || 'tec-1',
      technicianName: finalTechName,
      date,
      time,
      cinemaId: currentCinema.id,
      cinemaName: currentCinema.name,
      salaId: currentSala.id,
      salaName: currentSala.name,
      salaType: currentSala.type,
      maintenanceType,
      generalDescription: generalDescription || observations,
      observations: observations || generalDescription,
      equipmentItems,
      photos,
      photoCaptions,
      digitalSignature,
      status: asDraft ? 'draft' : 'submitted',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveReport(newReport);

    // If room was Paralized or in Maintenance, automatically restore it to Ativa upon report completion
    if (!asDraft && currentSala && (currentSala.status === 'Paralizada' || currentSala.status === 'Manutenção')) {
      const restoredSala: Sala = {
        ...currentSala,
        status: 'Ativa',
        paralizedReason: undefined,
        paralizedAt: undefined,
      };
      saveSala(restoredSala);
      addActivityLog(
        'REATIVAR_SALA_AUTOMATICO',
        `Sala ${restoredSala.name} (${restoredSala.cinemaName}) desparalizada automaticamente após conclusão do relatório ${newReport.id}`,
        currentUser
      );
    }

    addActivityLog(
      asDraft ? 'SALVAR_RASCUNHO' : 'ENVIAR_RELATORIO',
      `Relatório ${newReport.id} (${asDraft ? 'Rascunho' : 'Finalizado'}) enviado para ${currentCinema.name} - ${currentSala.name}`,
      currentUser
    );

    setIsSubmitting(false);

    if (asDraft) {
      onReportSubmitted(newReport);
    } else {
      setSubmittedReportModal(newReport);
      // Automatically send the email with PDF report upon finalization
      sendAutomaticReportEmail(newReport);
    }
  };

  // Instant PDF Preview/Download
  const handleGeneratePDF = async () => {
    const currentCinema = cinemas.find((c) => c.id === selectedCinemaId);
    const currentSala = allSalas.find((s) => s.id === selectedSalaId) || filteredSalas.find((s) => s.id === selectedSalaId);
    const company = getCompanyConfig();

    const tempReport: MaintenanceReport = {
      id: `PREVIEW-${Math.floor(100 + Math.random() * 900)}`,
      technicianId: currentUser?.id || 'tec-1',
      technicianName: technicianName || currentUser?.name || 'Técnico Responsável',
      date,
      time,
      cinemaId: currentCinema?.id || '',
      cinemaName: currentCinema?.name || 'Cinema',
      salaId: currentSala?.id || '',
      salaName: currentSala?.name || 'Sala',
      salaType: currentSala?.type || 'Convencional',
      maintenanceType,
      generalDescription: generalDescription || observations,
      observations: observations || generalDescription,
      equipmentItems,
      photos,
      photoCaptions,
      digitalSignature,
      status: 'submitted',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await generateReportPDF(tempReport, company);
  };

  // Step Wizard state matching mockup panels
  const [activeStep, setActiveStep] = useState<number>(1);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* STEP WIZARD NAVIGATION TABS */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-2xl p-2 shadow-2xs flex overflow-x-auto scrollbar-none">
        {[
          { num: 1, title: 'Dados gerais' },
          { num: 2, title: 'Equipamentos' },
          { num: 3, title: 'Fotos' },
          { num: 4, title: 'Assinatura' },
          { num: 5, title: 'Relatório (PDF)' },
        ].map((step) => {
          const isActive = activeStep === step.num;
          return (
            <button
              key={step.num}
              type="button"
              onClick={() => setActiveStep(step.num)}
              className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center ${
                  isActive ? 'bg-white text-blue-600 font-black' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
                }`}
              >
                {step.num}
              </span>
              <span className="truncate">{step.title}</span>
            </button>
          );
        })}
      </div>

      {validationError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* STEP 1: DADOS GERAIS */}
      {activeStep === 1 && (
        <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xs">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">Nova Manutenção</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Preencha os dados da manutenção</p>
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-gray-700 dark:text-slate-300 border-b border-gray-100 dark:border-slate-800 pb-2">
              Dados gerais
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Selecionar Técnico Responsável *
                </label>
                <select
                  value={selectedTechnicianId}
                  onChange={(e) => {
                    const uId = e.target.value;
                    setSelectedTechnicianId(uId);
                    if (uId === 'outro') {
                      setTechnicianName('');
                    } else {
                      const foundUser = activeUsers.find((u) => u.id === uId);
                      setTechnicianName(foundUser ? foundUser.name : '');
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="">-- Selecione o Técnico Responsável * --</option>
                  {activeUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.role === 'admin' ? '(Admin)' : '(Técnico)'}
                    </option>
                  ))}
                  <option value="outro">Outro Técnico (Digitar Nome...)</option>
                </select>

                {selectedTechnicianId === 'outro' && (
                  <input
                    type="text"
                    value={technicianName}
                    onChange={(e) => setTechnicianName(e.target.value)}
                    placeholder="Digite o nome do técnico responsável..."
                    className="w-full mt-2 px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-slate-100 font-medium"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Data *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-slate-100 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Cinema *
                </label>
                <select
                  value={selectedCinemaId}
                  onChange={(e) => setSelectedCinemaId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-slate-100 font-medium"
                >
                  <option value="">-- Selecione o Cinema * --</option>
                  {cinemas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  Sala *
                </label>
                {!selectedCinemaId ? (
                  <div className="p-3 bg-gray-50 dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-xl text-xs text-gray-500 dark:text-slate-400 italic">
                    -- Selecione primeiro o Cinema --
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {filteredSalas.map((s) => {
                      const isSelected = selectedSalaId === s.id;
                      const roomNum = s.number || parseInt(s.name.replace(/\D/g, '')) || s.name;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedSalaId(s.id)}
                          className={`w-10 h-10 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white shadow-xs scale-105 ring-2 ring-blue-500/30'
                              : 'bg-gray-50 dark:bg-slate-800 border-[#E5E7EB] dark:border-slate-700 text-gray-800 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          {roomNum}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Tipo de manutenção *
                </label>
                <select
                  value={maintenanceType}
                  onChange={(e) => setMaintenanceType(e.target.value as MaintenanceType)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-slate-100 font-medium"
                >
                  <option value="Preventiva">Preventiva</option>
                  <option value="Corretiva">Corretiva</option>
                  <option value="Emergencial">Emergencial</option>
                  <option value="Inspeção">Inspeção</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Descrição geral
                </label>
                <textarea
                  rows={3}
                  value={generalDescription}
                  onChange={(e) => setGeneralDescription(e.target.value)}
                  placeholder="Manutenção preventiva realizada conforme checklist mensal."
                  className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-slate-100 font-medium"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-xl text-xs font-medium"
            >
              Cancelar
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSubmitReport(true)}
                className="px-4 py-2 border border-[#E5E7EB] dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-xl text-xs font-medium"
              >
                Salvar rascunho
              </button>
              <button
                type="button"
                onClick={() => {
                  if (validateStep1()) setActiveStep(2);
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
              >
                Avançar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: EQUIPAMENTOS */}
      {activeStep === 2 && (
        <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xs">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">Equipamentos</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Selecione e descreva os equipamentos</p>
          </div>

          {/* Pill Category Tabs */}
          <div className="flex flex-wrap gap-2 pt-1">
            {[
              { id: 'projetor', label: 'Projetor' },
              { id: 'servidor', label: 'Servidor' },
              { id: 'processador', label: 'Processador' },
              { id: 'automacao', label: 'Automação' },
              { id: 'outros', label: 'Outros' },
            ].map((cat) => {
              const isChecked = selectedCategories[cat.id as EquipmentCategory];
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryToggle(cat.id as EquipmentCategory)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Equipment Fields */}
          <div className="space-y-4 pt-2">
            {equipmentItems.map((item, index) => (
              <div key={item.id} className="p-4 bg-gray-50 dark:bg-slate-850 rounded-xl border border-gray-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 pb-2">
                  <span className="text-xs font-bold text-gray-800 dark:text-slate-200 uppercase">
                    Item #{index + 1} ({item.category})
                  </span>
                  {equipmentItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveEquipmentBlock(item.id)}
                      className="text-rose-500 hover:text-rose-600 text-xs font-medium"
                    >
                      Remover
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                      Modelo do Equipamento ({item.category}) *
                    </label>
                    <select
                      value={item.model}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleUpdateItemField(item.id, 'model', val);
                        const matchedModel = cinemaModels.find((m) => m.model === val);
                        if (matchedModel?.serialNumber) {
                          handleUpdateItemField(item.id, 'serialNumber', matchedModel.serialNumber);
                        }
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-slate-100 font-semibold"
                    >
                      <option value="">Selecione o equipamento deste cinema...</option>
                      {cinemaModels
                        .filter((m) => m.category === item.category)
                        .map((m) => (
                          <option key={m.id} value={m.model}>
                            {m.brand} {m.model} {m.serialNumber ? `(S/N: ${m.serialNumber})` : ''}
                          </option>
                        ))}
                      {cinemaModels.filter((m) => m.category === item.category).length === 0 && (
                        <option value={item.model || 'Equipamento Padrão'}>
                          {item.model || 'Nenhum específico cadastrado - Digitar abaixo'}
                        </option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                      Nº de Série
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: BKLD12345"
                      value={item.serialNumber || ''}
                      onChange={(e) => handleUpdateItemField(item.id, 'serialNumber', e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-slate-100 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Descrição da manutenção *
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Limpeza dos filtros e lente. Verificação de foco e convergência. Teste de imagem OK."
                    value={item.description}
                    onChange={(e) => handleUpdateItemField(item.id, 'description', e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-slate-100 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                      Peças substituídas
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Filtro modelo X2-100"
                      value={item.partsReplaced || ''}
                      onChange={(e) => handleUpdateItemField(item.id, 'partsReplaced', e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-slate-100 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                      Status *
                    </label>
                    <select
                      value={item.status}
                      onChange={(e) =>
                        handleUpdateItemField(item.id, 'status', e.target.value as EquipmentStatus)
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-slate-100 font-medium"
                    >
                      <option value="Funcionando">Funcionando</option>
                      <option value="Funcionando com restrições">Funcionando c/ restrições</option>
                      <option value="Necessita reparo">Necessita reparo</option>
                      <option value="Parado">Parado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                      Tempo gasto (HH:MM)
                    </label>
                    <input
                      type="text"
                      placeholder="01:30"
                      onChange={(e) => {
                        const mins = parseInt(e.target.value) || 90;
                        handleUpdateItemField(item.id, 'timeSpentMinutes', mins);
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-slate-100 font-medium"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Campo de Observações Fixo no Final do Passo 2 */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 dark:text-slate-200">Observações</span>
              <span className="text-[10px] text-gray-400 dark:text-slate-500 font-normal">Opcional</span>
            </label>
            <textarea
              id="maintenance-step2-observations"
              rows={3}
              placeholder="Digite aqui observações adicionais, pendências, recomendações técnicas ou notas gerais sobre os equipamentos..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              className="w-full p-3 bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-slate-100 font-medium placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all resize-y"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveStep(1)}
              className="px-4 py-2 border border-[#E5E7EB] dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-xl text-xs font-medium"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={() => setActiveStep(3)}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
            >
              Salvar e continuar
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: FOTOS */}
      {activeStep === 3 && (
        <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xs">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">Fotos</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Adicione fotos da manutenção</p>
          </div>

          {/* Upload Area */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => !isCompressingPhotos && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
              isCompressingPhotos
                ? 'border-blue-400 bg-blue-50/40 dark:bg-blue-950/20 cursor-wait'
                : 'border-gray-300 dark:border-slate-700 hover:border-blue-500 bg-gray-50/50 dark:bg-slate-800/50 cursor-pointer'
            }`}
          >
            {isCompressingPhotos ? (
              <div className="flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs font-bold text-blue-700 dark:text-blue-300">
                  Otimizando fotos para alta velocidade de envio...
                </p>
                <p className="text-[11px] text-gray-500">Compactando imagens automaticamente</p>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-700 dark:text-slate-300">
                  Arraste as fotos aqui
                </p>
                <p className="text-[11px] text-gray-500 mt-1">ou toque para selecionar (Máx. 20 fotos)</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              disabled={isCompressingPhotos}
              onChange={(e) => handlePhotoUpload(e.target.files)}
              className="hidden"
            />
          </div>

          {/* Photo Gallery Grid with Observations */}
          {photos.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 dark:text-slate-200">
                  Fotos Anexadas ({photos.length})
                </span>
                <span className="text-[11px] text-gray-500 dark:text-slate-400">
                  Insira observações ou detalhes para cada imagem
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {photos.map((photo, pIdx) => (
                  <div
                    key={pIdx}
                    className="bg-white dark:bg-slate-850 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs flex flex-col"
                  >
                    <div className="relative aspect-video bg-slate-900 overflow-hidden">
                      <img
                        src={photo}
                        alt={`Foto ${pIdx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                        Foto #{pIdx + 1}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(pIdx)}
                        className="absolute top-2 right-2 w-7 h-7 bg-red-600/90 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md transition cursor-pointer"
                        title="Remover foto"
                      >
                        ×
                      </button>
                    </div>

                    <div className="p-3 bg-gray-50/70 dark:bg-slate-900/60 border-t border-gray-100 dark:border-slate-800 flex-1 flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold text-gray-700 dark:text-slate-300 flex items-center justify-between">
                        <span>Observações da foto #{pIdx + 1}</span>
                        <span className="text-[10px] text-gray-400 dark:text-slate-500 font-normal">Opcional</span>
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Ex: Detalhe do bloco óptico limpo, leitura de tensão, peça avariada..."
                        value={photoCaptions[pIdx] || ''}
                        onChange={(e) => handleUpdatePhotoCaption(pIdx, e.target.value)}
                        className="w-full p-2 text-xs bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all resize-y"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveStep(2)}
              className="px-4 py-2 border border-[#E5E7EB] dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-xl text-xs font-medium"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={() => setActiveStep(4)}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
            >
              Salvar e continuar
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: ASSINATURA */}
      {activeStep === 4 && (
        <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xs">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">Assinatura</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Assine abaixo com o dedo</p>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-2xl space-y-4">
            <SignaturePad
              initialSignature={digitalSignature}
              onSave={(sig) => setDigitalSignature(sig)}
              onClear={() => setDigitalSignature('')}
            />

            {/* Signature Line and Selected Technician Name */}
            <div className="pt-3 border-t border-dashed border-gray-300 dark:border-slate-700 text-center space-y-1">
              <div className="w-64 h-0.5 bg-gray-400 dark:bg-slate-600 mx-auto mb-2" />
              <div className="font-black text-sm text-gray-900 dark:text-slate-100">
                {technicianName || currentUser?.name || 'Técnico Responsável'}
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider text-[10px]">
                Técnico Responsável
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveStep(3)}
              className="px-4 py-2 border border-[#E5E7EB] dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Voltar
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveStep(5)}
                className="px-4 py-2 border border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Visualizar Relatório</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                id="btn-finalize-and-send-step4"
                type="button"
                onClick={() => handleSubmitReport(false)}
                disabled={isSubmitting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Finalizar e Enviar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: RELATÓRIO (PDF PREVIEW) */}
      {activeStep === 5 && (
        <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">Relatório (PDF Preview)</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Revise os dados antes de finalizar o atendimento
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Pronto para envio
              </span>
            </div>
          </div>

          {/* Paper Mockup Preview */}
          <div className="bg-white text-gray-900 border border-gray-200 rounded-2xl p-6 shadow-md max-w-2xl mx-auto space-y-4 text-xs font-sans">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <CalibraCineLogo size="sm" iconOnly />
                <div>
                  <div className="font-extrabold text-sm text-gray-900">{company.name || 'CalibraCine'}</div>
                  <div className="text-[10px] text-gray-500">Relatório Técnico de Manutenções</div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  PRÉ-VISUALIZAÇÃO
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-gray-700 bg-gray-50/70 p-3 rounded-xl border border-gray-100">
              <div><strong className="text-gray-900">Cinema:</strong> {cinemas.find((c) => c.id === selectedCinemaId)?.name || 'Não selecionado'}</div>
              <div><strong className="text-gray-900">Sala:</strong> {filteredSalas.find((s) => s.id === selectedSalaId)?.name || 'Não selecionada'}</div>
              <div><strong className="text-gray-900">Data:</strong> {date} {time}</div>
              <div><strong className="text-gray-900">Técnico:</strong> {technicianName || currentUser?.name || 'Técnico Responsável'}</div>
              <div className="col-span-2"><strong className="text-gray-900">Tipo de Manutenção:</strong> {maintenanceType}</div>
              {generalDescription && (
                <div className="col-span-2 pt-1 border-t border-gray-200/60">
                  <strong className="text-gray-900">Descrição Geral:</strong> {generalDescription}
                </div>
              )}
              {observations && (
                <div className="col-span-2 pt-1 border-t border-gray-200/60">
                  <strong className="text-gray-900">Observações:</strong> {observations}
                </div>
              )}
            </div>

            <div className="border-t pt-2">
              <div className="font-bold uppercase text-[10px] text-gray-500 tracking-wider mb-1.5 flex items-center justify-between">
                <span>EQUIPAMENTOS ({equipmentItems.length})</span>
              </div>
              {equipmentItems.length === 0 ? (
                <div className="text-gray-400 italic text-[11px] py-2 text-center">Nenhum equipamento adicionado</div>
              ) : (
                <div className="space-y-1.5">
                  {equipmentItems.map((item, idx) => (
                    <div key={idx} className="bg-gray-50 p-2.5 rounded-lg text-[11px] border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-gray-900">
                          {item.category.toUpperCase()}: <span className="text-blue-700">{item.model}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 font-semibold">
                          {item.status}
                        </span>
                      </div>
                      {item.assetNumber && (
                        <div className="text-gray-500 text-[10px]">
                          Patrimônio: {item.assetNumber} {item.serialNumber ? `• N/S: ${item.serialNumber}` : ''}
                        </div>
                      )}
                      <div className="text-gray-600 mt-0.5">
                        <strong>Descrição:</strong> {item.description || 'Manutenção técnica executada.'}
                      </div>
                      {item.partsReplaced && (
                        <div className="text-amber-800 text-[10px] mt-0.5">
                          <strong>Peças trocadas:</strong> {item.partsReplaced}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {photos.length > 0 && (
              <div className="border-t pt-2">
                <div className="font-bold text-[10px] text-gray-500 uppercase mb-1.5">
                  FOTOS ANEXADAS ({photos.length})
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {photos.map((p, idx) => (
                    <div key={idx} className="bg-gray-50 p-2 rounded-lg border border-gray-200 text-[11px]">
                      <img
                        src={p}
                        alt={`Foto ${idx + 1}`}
                        className="w-full aspect-video rounded object-cover mb-1.5 border border-gray-200"
                      />
                      <div className="font-bold text-gray-800 text-[10px]">Foto #{idx + 1}</div>
                      {photoCaptions[idx] && (
                        <div className="text-gray-600 text-[10px] line-clamp-2 mt-0.5">
                          {photoCaptions[idx]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {digitalSignature && (
              <div className="border-t pt-2 flex items-center justify-between">
                <div>
                  <div className="font-bold text-[10px] text-gray-500 mb-1">ASSINATURA DIGITAL DO TÉCNICO</div>
                  <img
                    src={digitalSignature}
                    alt="Assinatura"
                    className="h-10 object-contain border border-gray-200 rounded p-1 bg-white"
                  />
                </div>
                <div className="text-right text-[10px] text-gray-500">
                  <span className="font-bold text-gray-800">{technicianName || currentUser?.name}</span>
                  <br />
                  CalibraCine • Auditoria Digital
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveStep(4)}
                className="px-4 py-2 border border-[#E5E7EB] dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 text-xs font-medium transition cursor-pointer"
              >
                Cancelar
              </button>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                id="btn-download-pdf-preview"
                type="button"
                onClick={handleGeneratePDF}
                className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 text-gray-700 dark:text-slate-200 border border-gray-300 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                title="Visualizar e baixar arquivo PDF localmente"
              >
                <FileDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Baixar PDF</span>
              </button>

              <button
                id="btn-finalize-and-send-report"
                type="button"
                onClick={() => handleSubmitReport(false)}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando e Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Finalizar e Enviar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submitted Report Success & Email Dispatch Modal */}
      {submittedReportModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-60">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 w-full max-w-lg shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
              <CheckCircle className="w-9 h-9" />
            </div>

            <div>
              <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-mono font-bold text-xs rounded-md">
                {submittedReportModal.id}
              </span>
              <h3 className="text-lg font-black text-gray-900 dark:text-slate-100 mt-2">
                Relatório de Manutenção Enviado!
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                {submittedReportModal.cinemaName} • {submittedReportModal.salaName}
              </p>
            </div>

            {/* Automatic Email dispatch feedback */}
            {autoEmailStatus.sending ? (
              <div className="p-4 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl text-left space-y-2 text-xs text-sky-900 dark:text-sky-200 font-medium">
                <div className="font-bold flex items-center gap-2 text-sky-800 dark:text-sky-300">
                  <div className="w-4 h-4 border-2 border-sky-600 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>Enviando relatório por e-mail automaticamente...</span>
                </div>
                <p className="text-[11px] text-sky-700 dark:text-sky-300">
                  Gerando PDF e enviando para <strong>{autoEmailStatus.recipient}</strong>...
                </p>
              </div>
            ) : autoEmailStatus.success ? (
              <div className="space-y-3 text-left">
                <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl space-y-1.5 text-xs text-emerald-900 dark:text-emerald-200 font-medium">
                  <div className="font-bold flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>E-mail com PDF do relatório enviado automaticamente!</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    Cópia enviada com sucesso para: <strong>{autoEmailStatus.recipient}</strong>
                  </p>
                </div>

                {autoEmailStatus.isEthereal && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300 text-[11px]">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>E-mail capturado em Modo de Teste (Ethereal Mail)</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                      O servidor SMTP do Gmail requer a Senha de App configurada na aba Configurações.
                    </p>
                    {autoEmailStatus.previewUrl && (
                      <div className="pt-1">
                        <a
                          href={autoEmailStatus.previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block px-3 py-1.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/80 text-amber-950 dark:text-amber-100 font-bold rounded-lg text-[11px] border border-amber-300 dark:border-amber-700"
                        >
                          🔗 Visualizar mensagem enviada no Ethereal ↗
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : autoEmailStatus.error ? (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-left space-y-2 text-xs text-rose-900 dark:text-rose-200">
                <div className="font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Falha no Envio Automático</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => sendAutomaticReportEmail(submittedReportModal)}
                    className="px-2.5 py-1 bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 dark:hover:bg-rose-900 text-rose-950 dark:text-rose-100 font-bold rounded-lg text-[11px] border border-rose-300 dark:border-rose-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Mail className="w-3 h-3" />
                    <span>Tentar Novamente</span>
                  </button>
                </div>
                <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
                  {autoEmailStatus.error}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Destinatário: <strong>{autoEmailStatus.recipient}</strong>. Verifique as credenciais SMTP na aba Configurações se necessário.
                </p>
              </div>
            ) : null}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={async () => {
                  const company = getCompanyConfig();
                  await generateReportPDF(submittedReportModal, company);
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                <span>Baixar PDF Agora</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const r = submittedReportModal;
                  setSubmittedReportModal(null);
                  onReportSubmitted(r);
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Ver Relatórios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
