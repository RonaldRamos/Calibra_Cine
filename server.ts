import express from 'express';
import path from 'path';
import nodemailer from 'nodemailer';
import { createServer as createViteServer } from 'vite';

let cachedEtherealAccount: any = null;

async function getEtherealTransporter(fromAddress: string) {
  try {
    if (!cachedEtherealAccount) {
      cachedEtherealAccount = await nodemailer.createTestAccount();
    }
    return {
      transporter: nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: cachedEtherealAccount.user,
          pass: cachedEtherealAccount.pass,
        },
        connectionTimeout: 6000,
        greetingTimeout: 6000,
        socketTimeout: 8000,
      }),
      from: fromAddress,
      isEthereal: true,
    };
  } catch (ethErr) {
    console.warn('[Ethereal Account Fallback Warning]', ethErr);
    // Return a mocked json transport if network fails to create test account
    return {
      transporter: nodemailer.createTransport({
        jsonTransport: true,
      }),
      from: fromAddress,
      isEthereal: true,
    };
  }
}

async function getTransporter(customSmtp?: any, companyEmail?: string, companyName?: string) {
  let senderEmail = customSmtp?.fromEmail || customSmtp?.user || companyEmail || 'suporte.calibracine@gmail.com';
  let senderName = customSmtp?.fromName || companyName || 'CalibraCine';

  // Filter out fictitious placeholder domains like @calibracine.com
  if (senderEmail.includes('calibracine.com') || senderEmail.includes('nao-responda')) {
    senderEmail = companyEmail && !companyEmail.includes('calibracine.com')
      ? companyEmail
      : 'suporte.calibracine@gmail.com';
  }

  const fromAddress = `"${senderName}" <${senderEmail}>`;

  // 1. Custom SMTP passed from settings
  if (customSmtp && customSmtp.host && customSmtp.user && customSmtp.pass && customSmtp.pass.trim() !== '') {
    return {
      transporter: nodemailer.createTransport({
        host: customSmtp.host,
        port: Number(customSmtp.port) || 587,
        secure: Boolean(customSmtp.secure),
        auth: {
          user: customSmtp.user,
          pass: customSmtp.pass,
        },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 6000,
        greetingTimeout: 6000,
        socketTimeout: 8000,
      }),
      from: fromAddress,
      isEthereal: false,
    };
  }

  // 2. Environment Variables
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return {
      transporter: nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 6000,
        greetingTimeout: 6000,
        socketTimeout: 8000,
      }),
      from: process.env.SMTP_FROM || fromAddress,
      isEthereal: false,
    };
  }

  // 3. Fallback: Fast Cached Ethereal Test Account
  return getEtherealTransporter(fromAddress);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Routes
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', system: 'Cinema Maintenance Manager (CMM)', version: '1.0.0' });
  });

  // Test SMTP connection
  app.post('/api/test-smtp', async (req, res) => {
    try {
      const { smtpConfig, companyEmail, companyName } = req.body;
      const { transporter, isEthereal } = await getTransporter(smtpConfig, companyEmail, companyName);
      await transporter.verify();
      res.json({
        success: true,
        message: isEthereal
          ? 'Conexão simulada SMTP com sucesso (Modo Teste Ethereal).'
          : 'Conexão com servidor SMTP realizada com sucesso!',
        isEthereal,
      });
    } catch (err: any) {
      console.error('[SMTP Test Error]', err);
      res.status(400).json({
        success: false,
        error: err.message || 'Falha ao conectar com o servidor SMTP',
      });
    }
  });

  // Password Recovery endpoint
  app.post('/api/recover-password', async (req, res) => {
    try {
      const { email, smtpConfig, companyEmail, companyName } = req.body;

      if (!email) {
        return res.status(400).json({ success: false, error: 'E-mail do usuário é obrigatório' });
      }

      const { transporter, from, isEthereal } = await getTransporter(smtpConfig, companyEmail, companyName);

      const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155; padding: 24px; }
            .header { text-align: center; border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 22px; color: #38bdf8; font-weight: 800; }
            .header p { margin: 4px 0 0 0; font-size: 12px; color: #f59e0b; text-transform: uppercase; font-weight: 700; }
            .content { font-size: 14px; line-height: 1.6; color: #cbd5e1; }
            .box { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center; }
            .footer { text-align: center; font-size: 11px; color: #64748b; margin-top: 24px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>CALIBRACINE</h1>
              <p>Recuperação de Senha de Acesso</p>
            </div>
            <div class="content">
              <p>Olá,</p>
              <p>Recebemos uma solicitação de recuperação de senha para o e-mail: <strong>${email}</strong>.</p>
              
              <div class="box">
                <p style="margin: 0; font-size: 12px; color: #94a3b8; font-weight: 600;">SENHA DE ACESSO ADMINISTRATIVO:</p>
                <p style="margin: 8px 0 0 0; font-size: 24px; font-weight: 900; color: #f59e0b; letter-spacing: 2px;">257910</p>
              </div>

              <p>Você pode utilizar a senha acima para se autenticar como Administrador no CalibraCine. Após fazer o login, é recomendável redefinir sua senha no painel de Perfil.</p>
            </div>
            <div class="footer">
              CalibraCine — Sistema de Gestão Técnica de Cinema Digital.
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from,
        to: email,
        subject: '[CalibraCine] Recuperação de Senha de Acesso',
        html: htmlBody,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('[Password Recovery Mail Sent]', info.messageId || info);

      let previewUrl: string | undefined = undefined;
      if (isEthereal) {
        previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      }

      res.json({
        success: true,
        message: 'E-mail de recuperação de senha enviado com sucesso!',
        isEthereal,
        previewUrl,
      });
    } catch (err: any) {
      console.error('[Password Recovery Error]', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Falha ao enviar e-mail de recuperação.',
      });
    }
  });

  // Send Email with PDF Report
  app.post('/api/send-email', async (req, res) => {
    try {
      const {
        recipientEmail,
        reportId,
        cinemaName,
        salaName,
        technicianName,
        date,
        time,
        maintenanceType,
        generalDescription,
        equipmentCount,
        pdfBase64,
        smtpConfig,
        companyEmail,
        companyName,
      } = req.body;

      if (!recipientEmail) {
        return res.status(400).json({ success: false, error: 'E-mail do destinatário é obrigatório' });
      }

      const { transporter, from, isEthereal } = await getTransporter(smtpConfig, companyEmail, companyName);

      // Clean PDF base64 if provided
      let pdfBuffer: Buffer | null = null;
      if (pdfBase64) {
        // Remove data URI prefix (e.g. data:application/pdf;filename=...;base64,)
        const base64Data = pdfBase64.includes('base64,')
          ? pdfBase64.split('base64,')[1]
          : pdfBase64.replace(/^data:application\/pdf;.*?,/, '');
        pdfBuffer = Buffer.from(base64Data, 'base64');
      }

      const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
            .header { background-color: #0f172a; padding: 24px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
            .header p { margin: 4px 0 0 0; font-size: 12px; color: #f59e0b; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
            .content { padding: 24px; }
            .card { background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin-bottom: 20px; border-left: 4px solid #0284c7; }
            .card-grid { display: table; width: 100%; }
            .card-row { display: table-row; }
            .card-cell { display: table-cell; padding: 6px 0; font-size: 13px; }
            .card-cell.label { font-weight: bold; color: #64748b; width: 40%; }
            .card-cell.value { font-weight: bold; color: #0f172a; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; background: #e0f2fe; color: #0369a1; }
            .description-box { background: #fafafa; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; font-size: 13px; color: #334155; margin-top: 12px; line-height: 1.5; }
            .footer { background-color: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>CALIBRACINE</h1>
              <p>Relatório Técnico de Manutenção</p>
            </div>
            <div class="content">
              <p style="font-size: 14px; line-height: 1.5;">
                Olá,
              </p>
              <p style="font-size: 14px; line-height: 1.5;">
                O relatório de manutenção preventiva/corretiva do relatório <strong>${reportId || 'CMM'}</strong> está disponível e segue em anexo em formato PDF.
              </p>

              <div class="card">
                <div class="card-grid">
                  <div class="card-row">
                    <div class="card-cell label">Relatório:</div>
                    <div class="card-cell value">${reportId || 'N/A'}</div>
                  </div>
                  <div class="card-row">
                    <div class="card-cell label">Cinema:</div>
                    <div class="card-cell value">${cinemaName || 'N/A'}</div>
                  </div>
                  <div class="card-row">
                    <div class="card-cell label">Sala:</div>
                    <div class="card-cell value">${salaName || 'N/A'}</div>
                  </div>
                  <div class="card-row">
                    <div class="card-cell label">Técnico Responsável:</div>
                    <div class="card-cell value">${technicianName || 'N/A'}</div>
                  </div>
                  <div class="card-row">
                    <div class="card-cell label">Data/Hora:</div>
                    <div class="card-cell value">${date || ''} ${time ? `às ${time}` : ''}</div>
                  </div>
                  <div class="card-row">
                    <div class="card-cell label">Tipo de Manutenção:</div>
                    <div class="card-cell value"><span class="badge">${maintenanceType || 'Geral'}</span></div>
                  </div>
                  ${equipmentCount ? `
                  <div class="card-row">
                    <div class="card-cell label">Equipamentos Atendidos:</div>
                    <div class="card-cell value">${equipmentCount} item(ns)</div>
                  </div>
                  ` : ''}
                </div>
              </div>

              ${generalDescription ? `
              <div style="margin-top: 16px;">
                <strong style="font-size: 12px; text-transform: uppercase; color: #64748b;">Observações / Diagnóstico:</strong>
                <div class="description-box">${generalDescription}</div>
              </div>
              ` : ''}

              <p style="font-size: 13px; color: #475569; margin-top: 20px;">
                📎 <strong>Arquivo em anexo:</strong> <code>Relatorio_Manutencao_${reportId || 'CMM'}.pdf</code>
              </p>
            </div>
            <div class="footer">
              Enviado através do CalibraCine — Sistema de Gestão Técnica de Cinema Digital.
            </div>
          </div>
        </body>
        </html>
      `;

      const attachments = [];
      if (pdfBuffer && pdfBuffer.length > 0) {
        attachments.push({
          filename: `Relatorio_Manutencao_${reportId || 'CMM'}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
          contentDisposition: 'attachment',
        });
      }

      const mailOptions = {
        from,
        to: recipientEmail,
        subject: `[CalibraCine] Relatório de Manutenção - ${cinemaName || ''} - ${salaName || ''} (${reportId || 'CMM'})`,
        html: htmlBody,
        attachments,
      };

      const info = await transporter.sendMail(mailOptions);
      const previewUrl = isEthereal ? nodemailer.getTestMessageUrl(info) : null;

      console.log(`[CMM Email] Relatório ${reportId} enviado para ${recipientEmail}. MessageId: ${info.messageId}`);

      res.json({
        success: true,
        message: isEthereal
          ? `E-mail processado e enviado para ${recipientEmail} (Modo de Teste Ethereal).`
          : `E-mail com o relatório PDF enviado com sucesso para ${recipientEmail}!`,
        messageId: info.messageId,
        previewUrl,
        isEthereal,
      });
    } catch (err: any) {
      console.error('[CMM Email Error]', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Erro ao processar e enviar o e-mail',
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CMM Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[CMM Server Error]', err);
});
