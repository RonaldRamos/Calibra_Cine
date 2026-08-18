export type Role = 'admin' | 'technician';

export type UserStatus = 'ativo' | 'inativo';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  password?: string;
  phone?: string;
  avatar?: string;
  specialty?: string;
  status: UserStatus;
  createdAt: string;
}

export type CinemaStatus = 'ativo' | 'inativo';

export interface Cinema {
  id: string;
  name: string;
  city: string;
  state: string;
  address: string;
  phone: string;
  email: string;
  notes?: string;
  status: CinemaStatus;
  createdAt: string;
}

export type SalaType = 'Convencional' | 'Premium' | 'IMAX' | 'VIP' | 'Cinepic' | 'Laser';

export type SalaStatus = 'Ativa' | 'Paralizada' | 'Manutenção';

export interface Sala {
  id: string;
  cinemaId: string;
  cinemaName?: string;
  number: number;
  name: string;
  type: SalaType;
  status?: SalaStatus;
  paralizedReason?: string;
  paralizedAt?: string;
  notes?: string;
  createdAt: string;
}

export type EquipmentCategory = 'projetor' | 'servidor' | 'processador' | 'automacao' | 'outros';

export interface EquipmentCategoryInfo {
  id: EquipmentCategory;
  label: string;
  description: string;
  iconName: string;
}

export interface EquipmentModel {
  id: string;
  category: EquipmentCategory;
  brand: string;
  model: string;
  cinemaId?: string; // ID do cinema ao qual o equipamento pertence (ou vazio para todos)
  cinemaName?: string;
  serialNumber?: string;
  description?: string;
}

export type EquipmentStatus = 'Funcionando' | 'Funcionando com restrições' | 'Necessita reparo' | 'Parado';

export interface EquipmentMaintenanceItem {
  id: string;
  category: EquipmentCategory;
  model: string;
  assetNumber?: string;
  serialNumber?: string;
  description: string;
  partsReplaced?: string;
  timeSpentMinutes: number;
  status: EquipmentStatus;
}

export type MaintenanceType = 'Preventiva' | 'Corretiva' | 'Emergencial' | 'Inspeção';

export type ReportStatus = 'draft' | 'submitted';

export interface MaintenanceReport {
  id: string; // e.g., CMM-2026-001
  technicianId: string;
  technicianName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  cinemaId: string;
  cinemaName: string;
  salaId: string;
  salaName: string;
  salaType: SalaType;
  maintenanceType: MaintenanceType;
  generalDescription: string;
  observations?: string;
  equipmentItems: EquipmentMaintenanceItem[];
  photos: string[]; // Base64 or URL
  photoCaptions?: string[]; // Observações/legendas para cada foto
  digitalSignature?: string; // PNG Base64
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: Role;
  action: string;
  details: string;
  timestamp: string;
}

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

export interface CompanyConfig {
  name: string;
  cnpj: string;
  logoUrl?: string;
  phone: string;
  email: string;
  address: string;
  theme: 'light' | 'dark' | 'auto';
  language: 'pt-BR' | 'en' | 'es';
  backupAuto: boolean;
  smtp?: SMTPConfig;
}

export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  cinemaId?: string;
  salaId?: string;
  technicianId?: string;
  category?: EquipmentCategory | 'all';
  maintenanceType?: MaintenanceType | 'all';
  status?: ReportStatus | 'all';
  searchQuery?: string;
}

export interface DashboardStats {
  totalCinemas: number;
  totalSalas: number;
  totalTechnicians: number;
  totalReports: number;
  reportsToday: number;
  reportsThisMonth: number;
  totalEquipments: number;
  totalPhotos: number;
}

export type DemandStatus = 'Pendente' | 'Solicitado' | 'Aguardando Aprovação' | 'Concluido';

export type DemandPriority = 'Baixa' | 'Média' | 'Alta' | 'Urgente';

export interface DemandObservation {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface TechnicalDemand {
  id: string; // e.g., DEM-2026-001
  cinemaId: string;
  cinemaName: string;
  salaName: string; // Digitado livremente pelo usuário
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  status: DemandStatus; // 'Pendente' | 'Solicitado' | 'Aguardando Aprovação' | 'Concluido'
  priority?: DemandPriority;
  observations?: string;
  observationHistory?: DemandObservation[];
  createdById?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface DemandFilter {
  status?: DemandStatus | 'all' | 'vencidas';
  cinemaId?: string;
  searchQuery?: string;
}

export type MovementType = 'Emprestado' | 'Transferência Permanente' | 'Troca';

export type MovementStatus = 'Em Andamento' | 'Finalizado';

export interface EquipmentMovement {
  id: string; // e.g. MOV-2026-001
  equipmentDescription: string;
  equipmentCategory?: EquipmentCategory | string;
  equipmentSerial?: string;
  equipmentModel?: string;
  sourceCinemaId: string;
  sourceCinemaName: string;
  sourceSalaName?: string;
  destinationCinemaId: string;
  destinationCinemaName: string;
  destinationSalaName?: string;
  type: MovementType; // 'Emprestado' | 'Transferência Permanente' | 'Troca'
  status: MovementStatus; // 'Em Andamento' | 'Finalizado'
  date: string; // YYYY-MM-DD
  expectedReturnDate?: string; // YYYY-MM-DD (para Emprestado)
  reason?: string;
  notes?: string;
  completedAt?: string;
  completedNotes?: string;
  completedById?: string;
  completedByName?: string;
  createdById?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MovementFilter {
  type?: MovementType | 'all';
  status?: MovementStatus | 'all';
  sourceCinemaId?: string;
  destinationCinemaId?: string;
  searchQuery?: string;
}

export type StockStatus = 'Em Estoque' | 'Baixo Estoque' | 'Sem Estoque';

export interface InventoryItem {
  id: string; // e.g. EST-001
  cinemaId: string; // Cinema onde está estocado
  cinemaName: string;
  name: string; // Nome da peça / equipamento / suprimento
  category: EquipmentCategory | 'lampada' | 'pecas' | 'cabos' | 'optico' | 'outros' | string;
  brand?: string;
  model?: string;
  serialNumber?: string; // Número de série se for ativo unitário
  partNumber?: string; // Código de peça / fabricante
  location?: string; // Localização física (ex: Armário Cabine 1, Almoxarifado)
  quantity: number; // Quantidade atual em estoque
  minQuantity?: number; // Quantidade mínima de segurança (alerta de reposição)
  unit?: string; // un, pç, kit, par, metro, caixa
  status: StockStatus; // 'Em Estoque' | 'Baixo Estoque' | 'Sem Estoque'
  unitCost?: number; // Custo unitário estimado em R$
  notes?: string;
  lastRestockDate?: string; // Data da última reposição / entrada
  createdById?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryFilter {
  cinemaId?: string | 'all';
  category?: string | 'all';
  status?: StockStatus | 'all';
  searchQuery?: string;
}

