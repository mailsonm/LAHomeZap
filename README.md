# La Home Zap

An exclusive Google Chrome Extension designed for WhatsApp Web and WhatsApp Business, specifically built for **La Home Care** coordinators to streamline patient demands, organize active chats, and automate workflows.

---

## Language Selection / Selección de Idioma / Seleção de Idioma

- [English (EN)](#english-en)
- [Português (PT-BR)](#português-pt-br)
- [Español (ES)](#español-es)

---

## English (EN)

### Overview
**La Home Zap** integrates directly into WhatsApp Web. It reads configuration parameters, sets up event listeners, and coordinates signature injections, attendance tracking, and Kanban-style demand control without requiring external server infrastructures.

### Key Features
- **Attendant Signature**: Automatically inserts the active attendant's signature block (customizable with bold, italic, bracket framing, blockquote format, and line breaks) as soon as the user starts typing in the message box.
- **Interactive Kanban Board Sidebar**: React-based sidebar layout injected into WhatsApp Web's DOM inside an isolated Shadow DOM container to prevent styles from conflicting with the native WhatsApp CSS.
- **Storage Sync**: Settings and attendant definitions are persisted locally and synchronized across multiple browsers logged into the company's Google Workspace accounts using `chrome.storage.sync`.
- **Options Management**: Dedicated options page to register multiple attendants, mark favorites, and toggle global behaviors (Capitalize initials, Transfer alerts, Active attendance tracking, strict case formatting, and unique tag validation).

### Installation & Setup

1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd LAHomeZap
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Development & Compilation**:
   - For real-time updates and development reload:
     ```bash
     npm run dev
     ```
   - To build the production bundles (`content.js` and `options.html` inside `/dist`):
     ```bash
     npm run build
     ```

4. **Load the Extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`.
   - Toggle **Developer mode** in the top-right corner.
   - Click **Load unpacked** in the top-left and select the generated `/dist` folder.

### Testing
We use [Vitest](https://vitest.dev/) to run unit tests and ensure feature stability.
To run the test suite:
```bash
npm test
```
To run tests with watch mode enabled:
```bash
npm run test:watch
```

### Collaboration & Contribution
- **Style Guide**: Codebase variables, functions, CSS classes, and technical comments must be in **English ONLY**.
- **TDD-First Principle**: Never suggest or submit an implementation without first writing/updating its matching tests.
- **Architecture**: SOLID, Clean Code, and DRY are non-negotiable. Prefer composition over inheritance and decoupled messaging mechanisms.

---

## Português (PT-BR)

### Visão Geral
O **La Home Zap** integra-se diretamente ao WhatsApp Web. A extensão faz a leitura das configurações, registra listeners de eventos e coordena a injeção de assinaturas, controle de atendimentos e gerenciamento Kanban de demandas de forma 100% local, sem necessidade de servidores externos.

### Funcionalidades Principais
- **Assinatura de Atendentes**: Insere de forma automática a assinatura estilizada do atendente ativo (configurável com negrito, itálico, moldura de colchetes, destaque de citação e quebra de linha) no exato instante em que o usuário começa a digitar no chat.
- **Painel Kanban Lateral**: Interface reativa em React injetada no DOM do WhatsApp Web utilizando Shadow DOM para garantir isolamento total dos estilos da extensão contra o CSS nativo da Meta.
- **Sincronização Integrada**: Configurações de atendentes são mantidas e sincronizadas entre computadores da empresa utilizando `chrome.storage.sync` (vinculado à conta Google Workspace da corporação).
- **Gerenciamento de Opções**: Página de opções dedicada para cadastro de atendentes, definição de favoritos e controle de regras de negócio (alertas de transferência, maiúsculas automáticas, validação de etiquetas).

### Instalação e Execução

1. **Clonar o Repositório**:
   ```bash
   git clone <url-do-repositorio>
   cd LAHomeZap
   ```

2. **Instalar Dependências**:
   ```bash
   npm install
   ```

3. **Desenvolvimento e Compilação**:
   - Para monitorar alterações em tempo real:
     ```bash
     npm run dev
     ```
   - Para gerar o build final de produção (pasta `/dist` com `content.js` e `options.html` empacotados):
     ```bash
     npm run build
     ```

4. **Carregar no Chrome**:
   - Acesse `chrome://extensions/` no navegador.
   - Ative o **Modo do desenvolvedor** no canto superior direito.
   - Clique em **Carregar sem compactação** no canto superior esquerdo e aponte para a pasta `/dist` gerada.

### Testes
A suite de testes utiliza [Vitest](https://vitest.dev/) para garantir a segurança e regressão de funcionalidades.
Para executar a suite de testes:
```bash
npm test
```
Para executar testes em tempo real (watch mode):
```bash
npm run test:watch
```

### Colaboração e Regras de Desenvolvimento
- **Padrão do Código**: Variáveis, nomes de funções, classes CSS e comentários técnicos no código-fonte devem ser redigidos **exclusivamente em inglês**.
- **TDD-First**: Nunca sugira ou implemente um recurso sem antes definir o teste automatizado correspondente.
- **Princípios**: SOLID, Clean Code e DRY são mandatórios. Garanta o isolamento do Shadow DOM ao criar componentes visuais injetados.

---

## Español (ES)

### Resumen
**La Home Zap** se integra directamente con WhatsApp Web. La extensión lee los parámetros de configuración del almacenamiento, registra controladores de eventos y administra la inserción de firmas, control de transferencias y flujos Kanban de manera local, libre de costos de servidor.

### Características Principales
- **Firma Automática del Operador**: Inserta la firma del operador activo (personalizable con negrita, cursiva, corchetes, citas y salto de línea) en el momento exacto en que el usuario empieza a escribir en la caja de texto.
- **Tablero Kanban Lateral**: Panel interactivo basado en React inyectado en el DOM de WhatsApp Web mediante Shadow DOM para evitar conflictos visuales con las hojas de estilo nativas de WhatsApp.
- **Sincronización Compartida**: Configuraciones y listas de operadores sincronizadas automáticamente entre computadoras mediante la cuenta Google Workspace de la empresa con `chrome.storage.sync`.
- **Panel de Configuración**: Interfaz de opciones para el registro de operadores, asignación de favoritos y ajustes de flujo (capitalización de iniciales, alertas de transferencias y etiquetas del sistema).

### Instalación y Ejecución

1. **Clonar el Repositorio**:
   ```bash
   git clone <url-del-repositorio>
   cd LAHomeZap
   ```

2. **Instalar Dependências**:
   ```bash
   npm install
   ```

3. **Desenvolvimento e Compilação**:
   - Para monitorar e recarregar automaticamente em caso de mudanças:
     ```bash
     npm run dev
     ```
   - Para compilar os arquivos de produção (pasta `/dist` que inclui `content.js` e `options.html` listos):
     ```bash
     npm run build
     ```

4. **Cargar la Extensión en Chrome**:
   - Vaya a `chrome://extensions/` en Google Chrome.
   - Habilite el **Modo de desarrollador** (arriba a la derecha).
   - Presione **Cargar descomprimida** (arriba a la izquierda) y seleccione la carpeta `/dist` generada.

### Pruebas
Utilizamos [Vitest](https://vitest.dev/) para validar los componentes y evitar fallos en producción.
Para ejecutar la suite de pruebas:
```bash
npm test
```
Para ejecutar pruebas en tiempo real (watch mode):
```bash
npm run test:watch
```

### Directrices de Colaboración
- **Idioma del Código**: Las variables, funciones, nombres de clases CSS y comentarios técnicos deben escribirse **únicamente en inglés**.
- **Metodología TDD-First**: Cada funcionalidad desarrollada debe tener cobertura de pruebas automatizadas antes de realizar contribuciones.
- **Estándares**: SOLID, Clean Code y DRY son obligatorios. Asegurar el aislamiento en Shadow DOM para evitar efectos colaterales en la interfaz del WhatsApp.
