# Diretrizes e Regras Permanentes do CalibraCine

## 1. Preservação de Dados e Cadastros (CRÍTICO)
- **NUNCA** resetar, limpar ou sobrescrever dados existentes (cinemas, salas, equipamentos, relatórios de manutenção, demandas técnicas, logs de atividade, usuários e configurações da empresa) com dados semente (seed data) ou valores padrão.
- Em qualquer nova atualização, modificação de layout ou adição de recursos, **mantenha 100% das informações reais cadastradas** pelos usuários nos dispositivos e na nuvem (Firebase Firestore).
- A sincronização na nuvem (Firestore com listeners em tempo real) deve sempre priorizar os documentos já salvos no banco de dados.
- Modifique apenas os arquivos de código (componentes, lógica, estilos) sem executar resets de banco de dados ou apagar o `localStorage`/`sessionStorage` de dados do usuário.

## 2. Padrões de Qualidade
- Manter o tema claro sofisticado e modo escuro compatível.
- Garantir que todas as telas e modais continuem responsivos e com validação de dados em português.
