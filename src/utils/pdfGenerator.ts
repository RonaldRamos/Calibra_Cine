import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { MaintenanceReport, CompanyConfig, InventoryItem, Cinema, User } from '../types';
import { compressBase64Image } from './imageOptimizer';
import { formatDateBR, formatDateTimeBR } from './dateFormatter';

export interface GenerateInventoryPDFOptions {
  scope: 'all' | string; // 'all' or specific cinemaId
  cinemaName?: string;
  items: InventoryItem[];
  cinemas: Cinema[];
  company: CompanyConfig;
  user?: User | null;
  onlyAlerts?: boolean;
  selectedCategory?: string;
  selectedStatus?: string;
}

export async function generateInventoryPDF(options: GenerateInventoryPDFOptions): Promise<void> {
  const {
    scope,
    cinemaName,
    items,
    cinemas,
    company,
    user,
    onlyAlerts,
    selectedCategory,
    selectedStatus,
  } = options;

  const isAllCinemas = scope === 'all';
  const reportCode = `EST-${Date.now().toString(36).toUpperCase()}`;
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Calculate metrics
  const totalSKUs = items.length;
  const totalUnits = items.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  const inStockCount = items.filter((i) => i.status === 'Em Estoque').length;
  const lowStockCount = items.filter((i) => i.status === 'Baixo Estoque').length;
  const outOfStockCount = items.filter((i) => i.status === 'Sem Estoque').length;
  const totalValue = items.reduce((acc, curr) => {
    if (curr.unitCost && curr.quantity > 0) {
      return acc + curr.unitCost * curr.quantity;
    }
    return acc;
  }, 0);

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getCategoryLabel = (category: string) => {
    const map: Record<string, string> = {
      projetor: 'Projetores & Módulos',
      som: 'Áudio & Processamento',
      servidor: 'Servidores & IMB',
      lampada: 'Lâmpadas & Consumíveis',
      pecas: 'Peças & Placas',
      cabos: 'Cabos & Conectores',
      optico: 'Lentes & Ópticos',
      acessorios: 'Acessórios & 3D',
      outros: 'Outros',
    };
    return map[category] || category;
  };

  const statusColorMap: Record<string, { bg: string; text: string; border: string }> = {
    'Em Estoque': { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
    'Baixo Estoque': { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
    'Sem Estoque': { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
  };

  // Group items by Cinema if consolidated, or sort by category/name
  let itemRowsHtml = '';

  if (isAllCinemas) {
    // Group by cinema for cleaner layout
    const cinemaGroups: { cinema: Cinema; items: InventoryItem[] }[] = cinemas
      .map((c) => ({
        cinema: c,
        items: items.filter((i) => i.cinemaId === c.id),
      }))
      .filter((g) => g.items.length > 0);

    // Also include items with unmatched cinemaId if any
    const knownCinemaIds = new Set(cinemas.map((c) => c.id));
    const otherItems = items.filter((i) => !knownCinemaIds.has(i.cinemaId));
    if (otherItems.length > 0) {
      cinemaGroups.push({
        cinema: { id: 'other', name: 'Outros Locais', city: '', state: '', address: '', phone: '', email: '', status: 'ativo', createdAt: '' },
        items: otherItems,
      });
    }

    itemRowsHtml = cinemaGroups
      .map((group) => {
        const groupTotalUnits = group.items.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
        const groupTotalValue = group.items.reduce((acc, curr) => acc + (curr.unitCost ? curr.unitCost * curr.quantity : 0), 0);

        const groupRows = group.items
          .map((item, idx) => {
            const st = statusColorMap[item.status] || { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
            const itemTotalVal = item.unitCost ? item.unitCost * item.quantity : undefined;

            return `
            <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
              <td style="padding: 7px 8px; font-family: monospace; font-weight: 700; color: #b45309;">${item.id}</td>
              <td style="padding: 7px 8px;">
                <div style="font-weight: 700; color: #0f172a;">${item.name}</div>
                <div style="font-size: 10px; color: #64748b;">
                  ${item.brand ? `Marca: ${item.brand}` : ''} ${item.model ? `• Mod: ${item.model}` : ''} ${item.partNumber ? `• P/N: ${item.partNumber}` : ''}
                </div>
              </td>
              <td style="padding: 7px 8px; color: #334155;">${getCategoryLabel(item.category)}</td>
              <td style="padding: 7px 8px; color: #475569;">${item.location || '-'}</td>
              <td style="padding: 7px 8px; text-align: center; font-weight: 700; color: #0f172a;">
                ${item.quantity} <span style="font-size: 9px; font-weight: normal; color: #64748b;">${item.unit || 'un.'}</span>
                ${item.minQuantity ? `<div style="font-size: 9px; color: #64748b; font-weight: normal;">(Mín: ${item.minQuantity})</div>` : ''}
              </td>
              <td style="padding: 7px 8px; text-align: center;">
                <span style="display: inline-block; padding: 2px 7px; border-radius: 9999px; font-size: 9.5px; font-weight: 700; background-color: ${st.bg}; color: ${st.text}; border: 1px solid ${st.border};">
                  ${item.status}
                </span>
              </td>
              <td style="padding: 7px 8px; text-align: right; color: #334155;">${item.unitCost ? formatCurrency(item.unitCost) : '-'}</td>
              <td style="padding: 7px 8px; text-align: right; font-weight: 700; color: #0f172a;">${formatCurrency(itemTotalVal)}</td>
            </tr>
          `;
          })
          .join('');

        return `
        <tr style="background-color: #f1f5f9; border-top: 2px solid #cbd5e1; border-bottom: 2px solid #cbd5e1;">
          <td colspan="8" style="padding: 8px 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="color: #0f172a; font-size: 12px; text-transform: uppercase;">📍 ${group.cinema.name}</strong>
                ${group.cinema.city ? `<span style="font-size: 10px; color: #64748b; margin-left: 6px;">(${group.cinema.city} - ${group.cinema.state})</span>` : ''}
              </div>
              <div style="font-size: 11px; color: #334155;">
                <strong>${group.items.length}</strong> itens | <strong>${groupTotalUnits}</strong> un. físicas | Subtotal: <strong>${formatCurrency(groupTotalValue)}</strong>
              </div>
            </div>
          </td>
        </tr>
        ${groupRows}
      `;
      })
      .join('');
  } else {
    // Single cinema items
    itemRowsHtml = items
      .map((item, idx) => {
        const st = statusColorMap[item.status] || { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
        const itemTotalVal = item.unitCost ? item.unitCost * item.quantity : undefined;

        return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 8px; font-family: monospace; font-weight: 700; color: #b45309;">${item.id}</td>
          <td style="padding: 8px;">
            <div style="font-weight: 700; color: #0f172a;">${item.name}</div>
            <div style="font-size: 10px; color: #64748b;">
              ${item.brand ? `Marca: ${item.brand}` : ''} ${item.model ? `• Mod: ${item.model}` : ''} ${item.partNumber ? `• P/N: ${item.partNumber}` : ''} ${item.serialNumber ? `• S/N: ${item.serialNumber}` : ''}
            </div>
            ${item.notes ? `<div style="font-size: 9.5px; color: #475569; font-style: italic; margin-top: 2px;">Obs: ${item.notes}</div>` : ''}
          </td>
          <td style="padding: 8px; color: #334155;">${getCategoryLabel(item.category)}</td>
          <td style="padding: 8px; color: #475569;">${item.location || '-'}</td>
          <td style="padding: 8px; text-align: center; font-weight: 700; color: #0f172a;">
            ${item.quantity} <span style="font-size: 9px; font-weight: normal; color: #64748b;">${item.unit || 'un.'}</span>
            <div style="font-size: 9px; color: #64748b; font-weight: normal;">(Mín: ${item.minQuantity ?? 0})</div>
          </td>
          <td style="padding: 8px; text-align: center;">
            <span style="display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 9.5px; font-weight: 700; background-color: ${st.bg}; color: ${st.text}; border: 1px solid ${st.border};">
              ${item.status}
            </span>
          </td>
          <td style="padding: 8px; text-align: right; color: #334155;">${item.unitCost ? formatCurrency(item.unitCost) : '-'}</td>
          <td style="padding: 8px; text-align: right; font-weight: 700; color: #0f172a;">${formatCurrency(itemTotalVal)}</td>
        </tr>
      `;
      })
      .join('');
  }

  // Consolidated breakdown summary table per cinema if 'all'
  let consolidatedSummaryHtml = '';
  if (isAllCinemas && cinemas.length > 0) {
    const summaryRows = cinemas
      .map((c) => {
        const cItems = items.filter((i) => i.cinemaId === c.id);
        const cUnits = cItems.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
        const cLow = cItems.filter((i) => i.status === 'Baixo Estoque').length;
        const cOut = cItems.filter((i) => i.status === 'Sem Estoque').length;
        const cVal = cItems.reduce((acc, curr) => acc + (curr.unitCost ? curr.unitCost * curr.quantity : 0), 0);

        return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 6px 8px; font-weight: 700; color: #0f172a;">${c.name}</td>
          <td style="padding: 6px 8px; color: #64748b;">${c.city ? `${c.city}/${c.state}` : '-'}</td>
          <td style="padding: 6px 8px; text-align: center; font-weight: 600;">${cItems.length}</td>
          <td style="padding: 6px 8px; text-align: center; font-weight: 700; color: #059669;">${cUnits}</td>
          <td style="padding: 6px 8px; text-align: center;">
            ${cLow > 0 ? `<span style="color: #b45309; font-weight: 700;">${cLow}</span>` : '<span style="color: #94a3b8;">0</span>'}
          </td>
          <td style="padding: 6px 8px; text-align: center;">
            ${cOut > 0 ? `<span style="color: #dc2626; font-weight: 700;">${cOut}</span>` : '<span style="color: #94a3b8;">0</span>'}
          </td>
          <td style="padding: 6px 8px; text-align: right; font-weight: 700; color: #0f172a;">${formatCurrency(cVal)}</td>
        </tr>
      `;
      })
      .join('');

    consolidatedSummaryHtml = `
      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 12px; font-weight: 800; color: #1e293b; border-bottom: 2px solid #d97706; padding-bottom: 4px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          Resumo Consolidado por Complexo de Cinema
        </h3>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background-color: #ffffff;">
          <thead>
            <tr style="background-color: #1e293b; color: #ffffff; font-size: 10px; text-align: left;">
              <th style="padding: 6px 8px;">Cinema</th>
              <th style="padding: 6px 8px;">Cidade / UF</th>
              <th style="padding: 6px 8px; text-align: center;">Itens (SKUs)</th>
              <th style="padding: 6px 8px; text-align: center;">Unidades Físicas</th>
              <th style="padding: 6px 8px; text-align: center;">Baixo Estoque</th>
              <th style="padding: 6px 8px; text-align: center;">Sem Estoque</th>
              <th style="padding: 6px 8px; text-align: right;">Patrimônio (R$)</th>
            </tr>
          </thead>
          <tbody>
            ${summaryRows}
            <tr style="background-color: #f8fafc; font-weight: 800; border-top: 2px solid #cbd5e1; font-size: 11px;">
              <td colspan="2" style="padding: 7px 8px; text-transform: uppercase;">Total Geral da Rede:</td>
              <td style="padding: 7px 8px; text-align: center;">${totalSKUs}</td>
              <td style="padding: 7px 8px; text-align: center; color: #059669;">${totalUnits}</td>
              <td style="padding: 7px 8px; text-align: center; color: #b45309;">${lowStockCount}</td>
              <td style="padding: 7px 8px; text-align: center; color: #dc2626;">${outOfStockCount}</td>
              <td style="padding: 7px 8px; text-align: right; color: #0f172a;">${formatCurrency(totalValue)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  // Critical restock alert box
  const criticalItems = items.filter((i) => i.status === 'Sem Estoque' || i.status === 'Baixo Estoque');
  let criticalAlertsHtml = '';
  if (criticalItems.length > 0) {
    criticalAlertsHtml = `
      <div style="margin-bottom: 20px; background-color: #fffbeb; border-left: 4px solid #d97706; border: 1px solid #fef3c7; border-left-width: 4px; border-radius: 6px; padding: 12px;">
        <div style="font-size: 12px; font-weight: 800; color: #92400e; text-transform: uppercase; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
          ⚠️ Atenção: Itens em Ponto de Reposição / Críticos (${criticalItems.length})
        </div>
        <div style="font-size: 10.5px; color: #78350f; line-height: 1.5;">
          ${criticalItems
            .map(
              (it) =>
                `<strong>${it.name}</strong> (${it.cinemaName}) - Saldo: <strong>${it.quantity} ${it.unit || 'un.'}</strong> (Mínimo: ${it.minQuantity ?? 0}) [${it.status}]`
            )
            .slice(0, 8)
            .join(' • ')}
          ${criticalItems.length > 8 ? ` e mais <strong>${criticalItems.length - 8}</strong> itens.` : ''}
        </div>
      </div>
    `;
  }

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '850px';
  container.style.zIndex = '-9999';
  container.style.opacity = '1';
  container.style.pointerEvents = 'none';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  container.style.padding = '32px';
  container.style.boxSizing = 'border-box';

  container.innerHTML = `
    <!-- HEADER -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #d97706; padding-bottom: 16px; margin-bottom: 18px;">
      <div>
        <div style="font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">${company.name}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
          CNPJ: ${company.cnpj} | Tel: ${company.phone}<br/>
          ${company.address}
        </div>
      </div>
      <div style="text-align: right;">
        <div style="display: inline-block; padding: 4px 10px; background: #d97706; color: #ffffff; border-radius: 6px; font-weight: 800; font-size: 12px; letter-spacing: 0.5px;">
          ${reportCode}
        </div>
        <div style="font-size: 10px; color: #64748b; margin-top: 4px; font-weight: 600;">
          Emissão: ${dateStr} às ${timeStr}
        </div>
        ${user ? `<div style="font-size: 10px; color: #475569; margin-top: 2px;">Solicitado por: <strong>${user.name}</strong></div>` : ''}
      </div>
    </div>

    <!-- REPORT TITLE BANNER -->
    <div style="background-color: #fffbeb; border-left: 4px solid #d97706; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h2 style="margin: 0; font-size: 15px; font-weight: 900; color: #92400e; text-transform: uppercase; letter-spacing: 0.3px;">
          ${isAllCinemas ? 'Relatório Geral Consolidado de Estoque' : `Relatório de Estoque - ${cinemaName || 'Cinema'}`}
        </h2>
        <div style="font-size: 11.5px; color: #78350f; margin-top: 2px;">
          Controle de equipamentos sobressalentes, lâmpadas, placas e insumos técnicos • CalibraCine
        </div>
      </div>
      <div style="font-size: 11px; font-weight: 700; color: #92400e; text-align: right;">
        Escopo: ${isAllCinemas ? `Toda a Rede (${cinemas.length} Cinemas)` : cinemaName}<br/>
        Filtro: ${onlyAlerts ? 'Apenas Alertas (Baixo/Sem Estoque)' : selectedCategory && selectedCategory !== 'all' ? `Categoria: ${getCategoryLabel(selectedCategory)}` : 'Inventário Completo'}
      </div>
    </div>

    <!-- EXECUTIVE KPI METRICS -->
    <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px;">
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center;">
        <div style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Tipos de Itens (SKUs)</div>
        <div style="font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 2px;">${totalSKUs}</div>
        <div style="font-size: 9px; color: #94a3b8;">Itens Registrados</div>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center;">
        <div style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Saldo Físico Total</div>
        <div style="font-size: 18px; font-weight: 900; color: #059669; margin-top: 2px;">${totalUnits}</div>
        <div style="font-size: 9px; color: #94a3b8;">Peças / Unidades</div>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center;">
        <div style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Baixo Estoque</div>
        <div style="font-size: 18px; font-weight: 900; color: #d97706; margin-top: 2px;">${lowStockCount}</div>
        <div style="font-size: 9px; color: #94a3b8;">Alerta Reposição</div>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center;">
        <div style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Sem Estoque / Zerado</div>
        <div style="font-size: 18px; font-weight: 900; color: #dc2626; margin-top: 2px;">${outOfStockCount}</div>
        <div style="font-size: 9px; color: #94a3b8;">Necessita Compra</div>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center;">
        <div style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Patrimônio Estocado</div>
        <div style="font-size: 14px; font-weight: 900; color: #0f172a; margin-top: 4px;">${formatCurrency(totalValue)}</div>
        <div style="font-size: 9px; color: #94a3b8;">Valor Estimado</div>
      </div>
    </div>

    <!-- CRITICAL ALERTS BOX (IF ANY) -->
    ${criticalAlertsHtml}

    <!-- CONSOLIDATED SUMMARY (IF MULTI-CINEMA) -->
    ${consolidatedSummaryHtml}

    <!-- DETAILED INVENTORY TABLE -->
    <div style="margin-bottom: 24px;">
      <h3 style="font-size: 12px; font-weight: 800; color: #1e293b; border-bottom: 2px solid #d97706; padding-bottom: 4px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
        Detalhamento de Itens em Estoque (${items.length})
      </h3>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background-color: #ffffff;">
        <thead>
          <tr style="background-color: #0f172a; color: #ffffff; font-size: 10px; text-align: left;">
            <th style="padding: 8px;">Código</th>
            <th style="padding: 8px;">Item & Especificações</th>
            <th style="padding: 8px;">Categoria</th>
            <th style="padding: 8px;">Localização</th>
            <th style="padding: 8px; text-align: center;">Saldo / Mín</th>
            <th style="padding: 8px; text-align: center;">Situação</th>
            <th style="padding: 8px; text-align: right;">Unitário</th>
            <th style="padding: 8px; text-align: right;">Subtotal (R$)</th>
          </tr>
        </thead>
        <tbody>
          ${itemRowsHtml.length > 0 ? itemRowsHtml : `<tr><td colspan="8" style="padding: 16px; text-align: center; color: #64748b; font-size: 11px;">Nenhum item localizado com os filtros informados.</td></tr>`}
        </tbody>
      </table>
    </div>

    <!-- SIGNATURES & FOOTER -->
    <div style="margin-top: 32px; border-top: 2px solid #e2e8f0; padding-top: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px;">
        <div style="width: 260px; text-align: center; border-top: 1px solid #94a3b8; padding-top: 6px;">
          <div style="font-size: 11px; font-weight: 700; color: #0f172a;">${user?.name || 'Responsável Técnico'}</div>
          <div style="font-size: 10px; color: #64748b;">Conferência de Estoque / Almoxarifado</div>
        </div>

        <div style="width: 260px; text-align: center; border-top: 1px solid #94a3b8; padding-top: 6px;">
          <div style="font-size: 11px; font-weight: 700; color: #0f172a;">Gerência Operacional</div>
          <div style="font-size: 10px; color: #64748b;">Validação & Auditoria Técnica</div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #e2e8f0; padding-top: 8px;">
        <div style="font-size: 9.5px; color: #475569; font-weight: 600;">
          CalibraCine • Gestão Técnica & Manutenção de Cinema Digital
        </div>
        <div style="font-size: 9.5px; color: #94a3b8;">
          Documento gerado em ${dateStr} • Hash de Auditoria: ${reportCode}-${Date.now().toString(36).toUpperCase()}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    // Ensure all images are loaded before rendering
    const images = Array.from(container.querySelectorAll('img'));
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve();
            } else {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }
          })
      )
    );

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 850,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;

    while (heightLeft > 3) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;
    }

    const cleanCinemaName = isAllCinemas ? 'Geral_Todos_Cinemas' : (cinemaName || 'Cinema').replace(/\s+/g, '_');
    pdf.save(`Relatorio_Estoque_${cleanCinemaName}_${reportCode}.pdf`);
  } catch (error) {
    console.error('Error rendering Inventory PDF:', error);
    // Printable fallback
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(`<html><head><title>Relatório de Estoque ${reportCode}</title></head><body>${container.innerHTML}</body></html>`);
      printWin.document.close();
      printWin.focus();
      printWin.print();
    }
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

function renderReportPagesHtml(report: MaintenanceReport, optimizedPhotos: string[]): string {
  const photos = optimizedPhotos || [];
  const equipCount = report.equipmentItems?.length || 0;
  const techDisplayName = (report.technicianName && report.technicianName.trim().length > 0)
    ? report.technicianName
    : ((report as any).technician || 'Ronald Ramos');

  // Max usable content heights (in px at 800px width container)
  const PAGE_1_MAX_HEIGHT = 990;
  const PAGE_N_MAX_HEIGHT = 960;

  interface PageContent {
    html: string[];
    currentHeight: number;
  }

  const pages: PageContent[] = [{ html: [], currentHeight: 0 }];

  const getCurrentPage = () => pages[pages.length - 1];
  const getCurrentLimit = () => (pages.length === 1 ? PAGE_1_MAX_HEIGHT : PAGE_N_MAX_HEIGHT);

  const startNewPage = () => {
    pages.push({ html: [], currentHeight: 0 });
  };

  const addItem = (itemHtml: string, estimatedHeight: number) => {
    const page = getCurrentPage();
    const limit = getCurrentLimit();

    if (page.html.length > 0 && page.currentHeight + estimatedHeight > limit) {
      startNewPage();
    }

    const targetPage = getCurrentPage();
    targetPage.html.push(itemHtml);
    targetPage.currentHeight += estimatedHeight;
  };

  // 1. HEADER & METADATA (Always first on Page 1)
  const headerMetaHtml = `
    <!-- MODAL HEADER -->
    <div style="padding-bottom: 14px; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
        <span style="display: inline-block; vertical-align: middle; line-height: 22px; height: 22px; padding: 0 10px; background-color: #0284c7; color: #ffffff; font-weight: 700; font-size: 11px; border-radius: 6px; text-align: center; box-sizing: border-box;">
          ${report.id}
        </span>
        <span style="display: inline-block; vertical-align: middle; line-height: 22px; height: 22px; padding: 0 10px; background-color: ${report.status === 'submitted' ? '#dcfce7' : '#fef3c7'}; color: ${report.status === 'submitted' ? '#166534' : '#92400e'}; font-size: 10px; font-weight: 700; border-radius: 9999px; text-transform: uppercase; text-align: center; box-sizing: border-box;">
          ${report.status === 'submitted' ? 'Concluído' : 'Rascunho'}
        </span>
      </div>
      <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 4px 0 0 0; line-height: 1.3;">
        ${report.cinemaName} • ${report.salaName}
      </h2>
    </div>

    <!-- METADATA GRID -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; background-color: #f8fafc; padding: 14px 16px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 16px; box-sizing: border-box;">
      <div>
        <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; display: block; line-height: 1.2;">Técnico</span>
        <span style="font-size: 12px; font-weight: 700; color: #0f172a; display: block; margin-top: 3px; line-height: 1.3;">${techDisplayName}</span>
      </div>
      <div>
        <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; display: block; line-height: 1.2;">Data</span>
        <span style="font-size: 12px; font-weight: 700; color: #0f172a; display: block; margin-top: 3px; line-height: 1.3;">${formatDateBR(report.date)}</span>
      </div>
      <div>
        <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; display: block; line-height: 1.2;">Tipo Manutenção</span>
        <span style="font-size: 12px; font-weight: 700; color: #0284c7; display: block; margin-top: 3px; line-height: 1.3;">${report.maintenanceType}</span>
      </div>
      <div>
        <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; display: block; line-height: 1.2;">Tipo de Sala</span>
        <span style="font-size: 12px; font-weight: 700; color: #4f46e5; display: block; margin-top: 3px; line-height: 1.3;">${report.salaType}</span>
      </div>
    </div>
  `;
  addItem(headerMetaHtml, 150);

  // 2. GENERAL DESCRIPTION
  const descText = report.generalDescription || 'Sem observações gerais.';
  const descLines = Math.max(1, Math.ceil(descText.length / 80));
  const descHeight = 32 + descLines * 18 + 16;
  const descHtml = `
    <div style="margin-bottom: 14px;">
      <h3 style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 0 0 6px 0; line-height: 1.2;">
        Descrição Geral e Diagnóstico
      </h3>
      <div style="padding: 12px 14px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 11.5px; color: #1e293b; line-height: 1.5; white-space: pre-line; box-sizing: border-box;">
        ${descText}
      </div>
    </div>
  `;
  addItem(descHtml, descHeight);

  // 3. OBSERVATIONS (If any)
  if (report.observations && report.observations !== report.generalDescription) {
    const obsLines = Math.max(1, Math.ceil(report.observations.length / 80));
    const obsHeight = 32 + obsLines * 18 + 16;
    const obsHtml = `
      <div style="margin-bottom: 14px;">
        <h3 style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 0 0 6px 0; line-height: 1.2;">
          Observações
        </h3>
        <div style="padding: 12px 14px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 11.5px; color: #1e293b; line-height: 1.5; white-space: pre-line; box-sizing: border-box;">
          ${report.observations}
        </div>
      </div>
    `;
    addItem(obsHtml, obsHeight);
  }

  // 4. EQUIPMENT CHECKLIST
  if (equipCount > 0) {
    const equipTitleHtml = `
      <h3 style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 0 0 8px 0; line-height: 1.2;">
        Equipamentos Atendidos (${equipCount})
      </h3>
    `;
    addItem(equipTitleHtml, 26);

    (report.equipmentItems || []).forEach((item, idx) => {
      const isWorking = item.status === 'Funcionando';
      const isWarning = item.status === 'Funcionando com restrições' || item.status === 'Necessita reparo';
      const statusBg = isWorking ? '#dcfce7' : isWarning ? '#fef3c7' : '#fee2e2';
      const statusText = isWorking ? '#166534' : isWarning ? '#92400e' : '#991b1b';

      const itemHtml = `
        <div style="padding: 12px 14px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 10px; box-sizing: border-box;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 12px; font-weight: 800; color: #0f172a; line-height: 1.3;">
              ${item.model}
            </span>
            <span style="display: inline-block; vertical-align: middle; line-height: 18px; height: 18px; padding: 0 8px; font-size: 9.5px; font-weight: 700; border-radius: 9999px; background-color: ${statusBg}; color: ${statusText}; text-align: center; box-sizing: border-box;">
              ${item.status}
            </span>
          </div>
          <p style="font-size: 11.5px; color: #475569; margin: 0 0 8px 0; line-height: 1.4;">${item.description}</p>
          <div style="display: flex; flex-wrap: wrap; gap: 14px; font-size: 10.5px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 6px;">
            ${item.assetNumber ? `<span>Patrimônio: <strong style="color: #1e293b;">${item.assetNumber}</strong></span>` : ''}
            ${item.serialNumber ? `<span>S/N: <strong style="color: #1e293b;">${item.serialNumber}</strong></span>` : ''}
            ${item.partsReplaced ? `<span>Peças: <strong style="color: #1e293b;">${item.partsReplaced}</strong></span>` : ''}
            <span>Tempo: <strong style="color: #1e293b;">${item.timeSpentMinutes} min</strong></span>
          </div>
        </div>
      `;
      addItem(itemHtml, 84);
    });
  }

  // 5. PHOTOS SECTION (Flows naturally on Page 1 or wherever space allows)
  if (photos.length > 0) {
    const totalPhotoRows = Math.ceil(photos.length / 3);

    for (let r = 0; r < totalPhotoRows; r++) {
      const startIdx = r * 3;
      const rowPhotos = photos.slice(startIdx, startIdx + 3);
      const isFirstRow = r === 0;

      const pageBefore = pages.length;

      // Photo title if first row OR if row gets pushed to a brand new page
      let titleHtml = '';
      let titleHeight = 0;

      // Check if we need title
      if (isFirstRow) {
        titleHtml = `
          <h3 style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 6px 0 8px 0; line-height: 1.2;">
            Evidências Fotográficas (${photos.length})
          </h3>
        `;
        titleHeight = 28;
      }

      const rowHtml = `
        ${titleHtml}
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 10px;">
          ${rowPhotos.map((photo, colIdx) => {
            const photoIdx = startIdx + colIdx;
            const caption = report.photoCaptions?.[photoIdx];
            return `
            <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #f8fafc; display: flex; flex-direction: column; box-sizing: border-box;">
              <div style="position: relative; width: 100%; height: 132px; background-color: #0f172a; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                <img src="${photo}" alt="Foto ${photoIdx + 1}" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" />
                <div style="position: absolute; top: 6px; left: 6px; background-color: rgba(15, 23, 42, 0.85); color: #ffffff; font-size: 9.5px; font-weight: 700; line-height: 18px; height: 18px; padding: 0 7px; border-radius: 4px; z-index: 2; text-align: center; box-sizing: border-box;">
                  Foto #${photoIdx + 1}
                </div>
              </div>
              <div style="padding: 8px 10px; font-size: 10px; color: #334155; border-top: 1px solid #e2e8f0; background-color: #ffffff; flex-grow: 1; min-height: 40px; box-sizing: border-box;">
                <strong style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; display: block; margin-bottom: 2px; line-height: 1.2;">
                  Observação:
                </strong>
                <span style="line-height: 1.35; display: block; font-size: 10px; color: #334155; white-space: pre-line;">${caption ? caption : 'Sem observação'}</span>
              </div>
            </div>
            `;
          }).join('')}
        </div>
      `;

      addItem(rowHtml, 184 + titleHeight);

      // If a subsequent row was moved to a new page, optionally ensure section continuity
      if (!isFirstRow && pages.length > pageBefore && pages[pages.length - 1].html.length === 1) {
        // Prepend small continuation header
        const contTitle = `
          <h3 style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 0 0 8px 0; line-height: 1.2;">
            Evidências Fotográficas (continuação)
          </h3>
        `;
        pages[pages.length - 1].html.unshift(contTitle);
        pages[pages.length - 1].currentHeight += 26;
      }
    }
  }

  // 6. SIGNATURE BLOCK (Placed immediately after the content - matching visual mockup)
  const hasValidSignature = Boolean(report.digitalSignature && report.digitalSignature.trim().length > 30);

  const signatureHtml = `
    <div style="margin-top: 14px; margin-bottom: 8px;">
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;">
          <path d="m12 19 7-7 3 3-7 7-3-3z"/>
          <path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
          <path d="m2 2 7.586 7.586"/>
          <circle cx="11" cy="11" r="2"/>
        </svg>
        <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #334155; line-height: 1.2;">
          Assinatura Digital do Técnico
        </span>
      </div>
      <div style="width: 250px; padding: 14px 16px; background-color: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; box-sizing: border-box; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
        <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 10px; height: 66px; display: flex; align-items: center; justify-content: center; padding: 4px 8px; box-sizing: border-box; margin-bottom: 10px;">
          ${hasValidSignature ? `
            <img src="${report.digitalSignature}" alt="Assinatura Digital" style="max-height: 58px; max-width: 210px; width: auto; height: auto; object-fit: contain; display: block;" />
          ` : `
            <div style="width: 170px; border-bottom: 1.5px dashed #cbd5e1; padding-bottom: 4px; text-align: center;">
              <span style="font-size: 10px; font-style: italic; color: #94a3b8;">(Rubrica / Assinatura)</span>
            </div>
          `}
        </div>
        <div style="border-top: 1px solid #f1f5f9; padding-top: 8px;">
          <div style="font-size: 12.5px; font-weight: 800; color: #0f172a; line-height: 1.3;">
            ${techDisplayName}
          </div>
          <div style="font-size: 10px; font-weight: 500; color: #64748b; margin-top: 2px; line-height: 1.1;">
            Técnico Responsável
          </div>
        </div>
      </div>
    </div>
  `;
  addItem(signatureHtml, 145);

  // BUILD COMPLETE PAGES HTML WITH CORRECT TOTAL PAGES COUNT
  const totalPages = pages.length;

  return pages.map((page, pIdx) => {
    const pageNum = pIdx + 1;
    const isPageOne = pageNum === 1;

    return `
      <div class="pdf-page" style="width: 800px; height: 1130px; min-height: 1130px; max-height: 1130px; box-sizing: border-box; padding: ${isPageOne ? '34px 36px 20px 36px' : '30px 36px 20px 36px'}; background-color: #ffffff; color: #0f172a; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;">
        <div style="flex: 1 1 auto; display: flex; flex-direction: column;">
          ${!isPageOne ? `
            <!-- SECONDARY HEADER ON SUBSEQUENT PAGES -->
            <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0;">
              <div>
                <span style="font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; display: block; line-height: 1.2;">Relatório de Manutenção</span>
                <h2 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 2px 0 0 0; line-height: 1.3;">
                  ${report.cinemaName} • ${report.salaName}
                </h2>
              </div>
              <span style="display: inline-block; vertical-align: middle; line-height: 22px; height: 22px; padding: 0 10px; background-color: #0284c7; color: #ffffff; font-weight: 700; font-size: 11px; border-radius: 6px; text-align: center; box-sizing: border-box;">
                ${report.id}
              </span>
            </div>
          ` : ''}

          <!-- ACCUMULATED PAGE BLOCKS -->
          ${page.html.join('')}
        </div>

        <!-- FOOTER -->
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 6px; margin-top: 8px; box-sizing: border-box;">
          <span>CalibraCine • Relatório Técnico de Manutenção</span>
          <span>Página ${pageNum} de ${totalPages}</span>
        </div>
      </div>
    `;
  }).join('');
}

export async function generateReportPDFBase64(
  report: MaintenanceReport,
  company?: CompanyConfig,
  qrCodeDataUrl?: string
): Promise<string | null> {
  const pdfPromise = (async (): Promise<string | null> => {
    const rawPhotos = report.photos && report.photos.length > 0 ? report.photos.slice(0, 18) : [];
    const optimizedPhotos: string[] = await Promise.all(
      rawPhotos.map((p) => compressBase64Image(p, 800, 0.78))
    );

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '800px';
    container.style.zIndex = '-9999';
    container.style.opacity = '1';
    container.style.pointerEvents = 'none';
    container.style.backgroundColor = '#ffffff';

    container.innerHTML = renderReportPagesHtml(report, optimizedPhotos);
    document.body.appendChild(container);

    try {
      // Ensure all images are loaded before rendering
      const images = Array.from(container.querySelectorAll('img'));
      await Promise.all(
        images.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) {
                resolve();
              } else {
                img.onload = () => resolve();
                img.onerror = () => resolve();
              }
            })
        )
      );

      const pageElements = Array.from(container.querySelectorAll<HTMLElement>('.pdf-page'));
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pageElements.length; i++) {
        if (i > 0) pdf.addPage();
        const pageCanvas = await html2canvas(pageElements[i], {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          imageTimeout: 5000,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 800,
        });

        const imgData = pageCanvas.toDataURL('image/jpeg', 0.94);
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }

      return pdf.output('datauristring');
    } catch (error) {
      console.error('Error rendering PDF Base64:', error);
      return null;
    } finally {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    }
  })();

  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => {
      console.warn('[PDF Generator] Base64 generation timed out (6s safety cap). Continuing flow.');
      resolve(null);
    }, 6000);
  });

  return Promise.race([pdfPromise, timeoutPromise]);
}

export async function generateReportPDF(
  report: MaintenanceReport,
  company?: CompanyConfig,
  qrCodeDataUrl?: string
): Promise<void> {
  const rawPhotos = report.photos && report.photos.length > 0 ? report.photos.slice(0, 18) : [];
  const optimizedPhotos: string[] = await Promise.all(
    rawPhotos.map((p) => compressBase64Image(p, 900, 0.82))
  );

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '800px';
  container.style.zIndex = '-9999';
  container.style.opacity = '1';
  container.style.pointerEvents = 'none';
  container.style.backgroundColor = '#ffffff';

  container.innerHTML = renderReportPagesHtml(report, optimizedPhotos);
  document.body.appendChild(container);

  try {
    // Ensure all images are loaded before rendering
    const images = Array.from(container.querySelectorAll('img'));
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve();
            } else {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }
          })
      )
    );

    const pageElements = Array.from(container.querySelectorAll<HTMLElement>('.pdf-page'));
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pageElements.length; i++) {
      if (i > 0) pdf.addPage();
      const pageCanvas = await html2canvas(pageElements[i], {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        imageTimeout: 5000,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 800,
      });

      const imgData = pageCanvas.toDataURL('image/jpeg', 0.94);
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    }

    pdf.save(`Relatorio_CalibraCine_${report.id}.pdf`);
  } catch (error) {
    console.error('Error rendering PDF:', error);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

