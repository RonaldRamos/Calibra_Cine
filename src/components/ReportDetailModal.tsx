import React, { useState, useEffect } from 'react';
import {
  X,
  FileDown,
  Printer,
  Calendar,
  Clock,
  MapPin,
  Tv,
  User,
  ShieldAlert,
  Trash2,
  Maximize2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Mail,
  Send,
  Loader2,
  PenTool,
  Check,
  Edit3,
} from 'lucide-react';
import { MaintenanceReport, User as UserType } from '../types';
import { getCompanyConfig, deleteReport, saveReport, addActivityLog } from '../services/storageService';
import { generateReportPDF, generateReportPDFBase64 } from '../utils/pdfGenerator';
import { SignaturePad } from './SignaturePad';
import { formatDateBR } from '../utils/dateFormatter';

interface ReportDetailModalProps {
  report: MaintenanceReport | null;
  onClose: () => void;
  currentUser: UserType | null;
  onReportDeleted?: () => void;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  report: initialReport,
  onClose,
  currentUser,
  onReportDeleted,
}) => {
  const [report, setReport] = useState<MaintenanceReport | null>(initialReport);
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; caption?: string; index: number } | null>(null);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState<boolean>(false);
  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [emailSuccess, setEmailSuccess] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isEthereal, setIsEthereal] = useState<boolean>(false);
  
  // Signature editing modal / drawer state
  const [isEditingSignature, setIsEditingSignature] = useState<boolean>(false);
  const [tempSignature, setTempSignature] = useState<string>('');
  const [signatureSavedAlert, setSignatureSavedAlert] = useState<boolean>(false);

  useEffect(() => {
    setReport(initialReport);
    if (initialReport?.digitalSignature) {
      setTempSignature(initialReport.digitalSignature);
    }
  }, [initialReport]);

  useEffect(() => {
    if (showEmailModal) {
      const comp = getCompanyConfig();
      if (comp.email) {
        setRecipientEmail(comp.email);
      } else if (currentUser?.email) {
        setRecipientEmail(currentUser.email);
      }
    }
  }, [showEmailModal, report?.id]);

  if (!report) return null;

  const isAdmin = currentUser?.role === 'admin';
  const company = getCompanyConfig();

  const handleDownloadPDF = async () => {
    if (isDownloadingPDF) return;
    setIsDownloadingPDF(true);
    try {
      await generateReportPDF(report, company);
    } catch (err) {
      console.error('Error downloading PDF:', err);
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const handleSaveUpdatedSignature = () => {
    if (!tempSignature || !report) return;
    const updated: MaintenanceReport = {
      ...report,
      digitalSignature: tempSignature,
      updatedAt: new Date().toISOString(),
    };
    saveReport(updated);
    setReport(updated);
    setIsEditingSignature(false);
    setSignatureSavedAlert(true);
    setTimeout(() => setSignatureSavedAlert(false), 3500);

    addActivityLog(
      'ATUALIZAR_ASSINATURA',
      `Assinatura digital do relatório ${report.id} atualizada por ${currentUser?.name || report.technicianName}`,
      currentUser
    );
  };

  const handleSendEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !report) return;

    setIsSendingEmail(true);
    setEmailError(null);
    setPreviewUrl(null);

    try {
      // Generate PDF as base64
      const pdfBase64 = await generateReportPDFBase64(report, company);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
        setEmailSuccess(true);
        setIsEthereal(Boolean(data.isEthereal));
        if (data.previewUrl) setPreviewUrl(data.previewUrl);

        addActivityLog(
          'ENVIAR_EMAIL',
          `Cópia em PDF do relatório ${report.id} enviada para ${recipientEmail}`,
          currentUser
        );
      } else {
        setEmailError(data.error || 'Não foi possível enviar o e-mail. Verifique os dados do destinatário.');
      }
    } catch (err: any) {
      console.error('Email send error:', err);
      const isTimeout = err.name === 'AbortError';
      setEmailError(
        isTimeout
          ? 'Tempo limite de envio de e-mail atingido. Verifique suas configurações de SMTP ou conectividade.'
          : (err.message || 'Falha de conexão com o servidor de e-mail.')
      );
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDelete = () => {
    if (confirm(`Tem certeza que deseja excluir o relatório ${report.id}? Esta ação não pode ser desfeita.`)) {
      deleteReport(report.id);
      addActivityLog('EXCLUIR_RELATORIO', `Relatório ${report.id} excluído por ${currentUser?.name}`, currentUser);
      if (onReportDeleted) onReportDeleted();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative my-8">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-sky-600 text-white font-mono font-bold text-xs rounded-md">
                {report.id}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  report.status === 'submitted'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                {report.status === 'submitted' ? 'Concluído' : 'Rascunho'}
              </span>
            </div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-1">
              {report.cinemaName} • {report.salaName}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEmailModal(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Mail className="w-4 h-4" />
              <span>Enviar E-mail</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isDownloadingPDF}
              className={`px-3 py-1.5 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs ${
                isDownloadingPDF
                  ? 'bg-blue-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {isDownloadingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gerando PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>Baixar PDF</span>
                </>
              )}
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={handleDelete}
                className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                title="Excluir relatório"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Técnico</span>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{report.technicianName}</span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Data</span>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {formatDateBR(report.date)}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Tipo Manutenção</span>
              <span className="text-xs font-bold text-sky-600 dark:text-sky-400">{report.maintenanceType}</span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Tipo de Sala</span>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{report.salaType}</span>
            </div>
          </div>

          {/* General Description */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Descrição Geral e Diagnóstico
            </h3>
            <div className="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
              {report.generalDescription || 'Sem observações gerais.'}
            </div>
          </div>

          {/* Observations */}
          {report.observations && report.observations !== report.generalDescription && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Observações
              </h3>
              <div className="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                {report.observations}
              </div>
            </div>
          )}

          {/* Equipment Checklist */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Equipamentos Atendidos ({report.equipmentItems?.length || 0})
            </h3>

            <div className="space-y-3">
              {report.equipmentItems?.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                      {item.model}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.status === 'Funcionando'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300">{item.description}</p>

                  <div className="flex flex-wrap gap-4 text-[11px] text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-800">
                    {item.assetNumber && <span>Patrimônio: <strong className="text-slate-800 dark:text-slate-200">{item.assetNumber}</strong></span>}
                    {item.serialNumber && <span>S/N: <strong className="text-slate-800 dark:text-slate-200">{item.serialNumber}</strong></span>}
                    {item.partsReplaced && <span>Peças: <strong className="text-slate-800 dark:text-slate-200">{item.partsReplaced}</strong></span>}
                    <span>Tempo: <strong className="text-slate-800 dark:text-slate-200">{item.timeSpentMinutes} min</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Photo Gallery */}
          {report.photos && report.photos.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Evidências Fotográficas ({report.photos.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {report.photos.map((photo, pIdx) => {
                  const caption = report.photoCaptions?.[pIdx];
                  return (
                    <div
                      key={pIdx}
                      className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-850 flex flex-col shadow-2xs"
                    >
                      <div
                        onClick={() => setSelectedPhoto({ url: photo, caption, index: pIdx })}
                        className="relative group aspect-video bg-slate-900 cursor-pointer overflow-hidden"
                      >
                        <img
                          src={photo}
                          alt={`Foto ${pIdx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Maximize2 className="w-5 h-5" />
                        </div>
                        <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded">
                          Foto #{pIdx + 1}
                        </div>
                      </div>
                      {caption && (
                        <div className="p-2.5 text-xs text-slate-700 dark:text-slate-300 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-1">
                          <strong className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                            Observação:
                          </strong>
                          <span className="leading-relaxed text-[11px]">{caption}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Digital Signature */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-sky-500" />
                <span>Assinatura Digital do Técnico</span>
              </h3>
              {!isEditingSignature && (
                <button
                  type="button"
                  onClick={() => {
                    setTempSignature(report.digitalSignature || '');
                    setIsEditingSignature(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg border border-sky-200 dark:border-sky-800 transition cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>{report.digitalSignature ? 'Alterar Assinatura' : 'Adicionar Assinatura'}</span>
                </button>
              )}
            </div>

            {signatureSavedAlert && (
              <div className="mb-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Assinatura atualizada com sucesso! Ela constará no PDF baixado e nos envios.</span>
              </div>
            )}

            {isEditingSignature ? (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-4">
                <SignaturePad
                  initialSignature={tempSignature}
                  onSave={(sig) => setTempSignature(sig)}
                  onClear={() => setTempSignature('')}
                />
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setIsEditingSignature(false)}
                    className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveUpdatedSignature}
                    disabled={!tempSignature}
                    className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Salvar Assinatura</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl inline-block text-center min-w-[240px] shadow-2xs">
                {report.digitalSignature && report.digitalSignature.trim().length > 30 ? (
                  <div className="h-16 flex items-center justify-center mb-2 bg-slate-50 dark:bg-slate-850 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    <img
                      src={report.digitalSignature}
                      alt="Assinatura Digital"
                      className="max-h-14 max-w-[210px] object-contain mx-auto block"
                    />
                  </div>
                ) : (
                  <div className="h-14 flex items-end justify-center pb-2 border-b border-dashed border-slate-300 dark:border-slate-700 mb-2 text-slate-400 dark:text-slate-500 text-[11px] italic">
                    (Nenhuma rubrica anexada)
                  </div>
                )}
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 border-t border-slate-200 dark:border-slate-800 pt-1.5">
                  {report.technicianName || (report as any).technician || 'Ronald Ramos'}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Técnico Responsável
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox for High-Res Photo View */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-xs flex items-center justify-center p-4 z-60 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="relative flex-1 bg-black flex items-center justify-center max-h-[70vh]">
              <img
                src={selectedPhoto.url}
                alt={`Foto ${selectedPhoto.index + 1}`}
                className="max-w-full max-h-[70vh] object-contain"
              />
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full transition cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {selectedPhoto.caption && (
              <div className="p-4 bg-slate-900 border-t border-slate-800 text-xs text-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Foto #{selectedPhoto.index + 1} • Observação
                </div>
                <p className="leading-relaxed text-slate-300">{selectedPhoto.caption}</p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Send Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-60">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-lg flex items-center justify-center">
                  <Mail className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">Enviar Relatório por E-mail</h3>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">PDF do relatório {report.id}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {emailSuccess ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-semibold space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>E-mail com o relatório PDF enviado com sucesso para <strong>{recipientEmail}</strong>!</span>
                  </div>
                </div>

                {isEthereal && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-2">
                    <div className="flex items-start gap-2 font-bold text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>E-mail enviado em Modo de Teste (Simulação)</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                      O e-mail não chegou na sua caixa de entrada real do Gmail porque o servidor <strong>SMTP do Gmail</strong> ainda não foi ativado com a sua <strong>Senha de App</strong> nas configurações.
                    </p>
                    {previewUrl && (
                      <div className="py-1">
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block px-3 py-1.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/80 text-amber-950 dark:text-amber-100 font-bold rounded-lg text-[11px] border border-amber-300 dark:border-amber-700"
                        >
                          🔗 Ver mensagem capturada no Ethereal (Webmail de Teste)
                        </a>
                      </div>
                    )}
                    <div className="bg-amber-100/70 dark:bg-amber-900/30 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800 text-[11px] leading-relaxed">
                      <strong>Como receber e-mails no seu Gmail real:</strong>
                      <ol className="list-decimal list-inside mt-1 space-y-0.5">
                        <li>Vá no menu <strong>Configurações</strong> do sistema.</li>
                        <li>No campo Servidor SMTP, informe <code>smtp.gmail.com</code> e porta <code>587</code>.</li>
                        <li>No Usuário, insira seu e-mail do Gmail.</li>
                        <li>Na Senha, insira uma <strong>Senha de App</strong> criada em <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline font-bold text-amber-900 dark:text-amber-200">myaccount.google.com/apppasswords</a>.</li>
                      </ol>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEmailSuccess(false);
                      setShowEmailModal(false);
                    }}
                    className="px-5 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendEmailSubmit} className="space-y-3 text-xs">
                {emailError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-300 font-semibold space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{emailError}</span>
                    </div>
                    <div className="pt-1 text-[11px] text-slate-600 dark:text-slate-300">
                      Você pode configurar o servidor SMTP no menu <strong>Configurações</strong> ou abrir diretamente seu aplicativo de e-mail local:
                    </div>
                    <a
                      href={`mailto:${recipientEmail}?subject=${encodeURIComponent(`[CalibraCine] Relatório ${report.id} - ${report.cinemaName}`)}&body=${encodeURIComponent(`Segue em anexo o relatório de manutenção ${report.id} para o cinema ${report.cinemaName} (${report.salaName}).\n\nTécnico: ${report.technicianName}\nData: ${report.date}\nTipo: ${report.maintenanceType}`)}`}
                      className="inline-block px-3 py-1.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/80 text-rose-900 dark:text-rose-100 font-bold rounded-lg text-[11px] border border-rose-300 dark:border-rose-700"
                    >
                      ✉️ Abrir aplicativo de e-mail (mailto)
                    </a>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">E-mail do Destinatário *</label>
                  <input
                    type="email"
                    required
                    disabled={isSendingEmail}
                    placeholder="usuario@cinestar.com.br"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl font-semibold text-gray-900 dark:text-slate-100"
                  />
                </div>

                <div className="bg-gray-50 dark:bg-slate-850 p-3 rounded-xl border border-gray-200 dark:border-slate-800 space-y-1.5 text-[11px] text-gray-600 dark:text-slate-400">
                  <p className="font-bold text-gray-800 dark:text-slate-200">Destinatários Rápidos (Cadastrados no Sistema):</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {company.email && (
                      <button
                        type="button"
                        disabled={isSendingEmail}
                        onClick={() => setRecipientEmail(company.email)}
                        className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-md font-semibold hover:underline cursor-pointer border border-blue-200 dark:border-blue-800"
                      >
                        E-mail Oficial ({company.email})
                      </button>
                    )}
                    {currentUser?.email && currentUser.email !== company.email && (
                      <button
                        type="button"
                        disabled={isSendingEmail}
                        onClick={() => setRecipientEmail(currentUser.email)}
                        className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md font-semibold hover:underline cursor-pointer border border-slate-200 dark:border-slate-700"
                      >
                        Meu E-mail ({currentUser.email})
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isSendingEmail}
                      onClick={() => setRecipientEmail(report.technicianName.includes('@') ? report.technicianName : 'roberto.tecnico@calibracine.com')}
                      className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md font-semibold hover:underline cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      Técnico Responsável
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={isSendingEmail}
                    onClick={() => setShowEmailModal(false)}
                    className="px-4 py-2 font-medium text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingEmail}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {isSendingEmail ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Disparar E-mail</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
