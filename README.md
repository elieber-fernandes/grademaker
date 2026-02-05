# Timetable+ 🎓
> O Gerador de Horários Escolares Definitivo.

**Timetable+** (anteriormente Urânia+) é uma aplicação web moderna e intuitiva projetada para resolver o complexo problema de criação de grades horárias escolares. Combinando um algoritmo inteligente com uma interface "Premium", ele permite que escolas gerem, ajustem e exportem seus horários em minutos, não dias.

![Timetable+ Preview](https://placehold.co/800x400/6366f1/ffffff?text=Timetable%2B+Preview)

## ✨ Funcionalidades Principais

- **🤖 Geração Automática**: Algoritmo que distribui aulas evitando conflitos de professores e horários.
- **📊 Smart Import (Excel)**: Copie e cole seus dados (Professores e Disciplinas) direto do Excel. O sistema entende e vincula tudo automaticamente.
- **📚 Definição Curricular**: Interface visual para definir a carga horária de cada turma (Ex: 4 aulas de Matemática no 1º Ano A).
- **🖱️ Drag & Drop**: Ajuste fino da grade arrastando e soltando os cards de aula.
- **🎨 Design Premium**: Interface moderna com Glassmorphism, animações fluídas e Modo "Zen".
- **🖨️ Exportação Pronta**:
    - **Impressão/PDF**: Layout limpo, sem menus, perfeito para imprimir ou salvar como PDF.
    - **CSV**: Exporte os dados brutos para planilhas.

## 🛠️ Tecnologias

Built with modern web standards:
- **Core**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [TailwindCSS](https://tailwindcss.com/) + CSS Modules (Glassmorphism)
- **State**: [Zustand](https://github.com/pmndrs/zustand)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)

## 🚀 Como Rodar

1. **Clone o repositório**
   ```bash
   git clone https://github.com/elieber-fernandes/timetable.git
   cd timetable
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento**
   ```bash
   npm run dev
   ```

4. **Build para Produção**
   ```bash
   npm run build
   ```

## 📝 Como Usar

1.  Acesse a aba **Importar (Upload)** e cole seus dados de Professores/Disciplinas da sua planilha.
2.  Vá em **Currículo (Library)** e defina quantas aulas cada matéria tem por turma.
3.  Acesse **Gerar Grade (Sparkles)** e clique em "Gerar Grade Automática".
4.  Faça ajustes manuais se necessário arrastando as aulas.
5.  Clique em **Imprimir** para salvar sua grade em PDF.

---

Desenvolvido por Elieber Fernandes.
