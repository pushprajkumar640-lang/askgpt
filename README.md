<div align="center">

# 🤖 AskGPT

### Your AI Assistant for Smarter Conversations

A modern AI-powered chatbot for intelligent conversations, coding,
learning, current information, and everyday assistance.

<br>

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Gemini](https://img.shields.io/badge/Google-Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

<br>

**Built with React • Node.js • Gemini • Prisma • PostgreSQL**

</div>

---

## ✨ About

**AskGPT** is a modern AI-powered chatbot created and developed by
**Pushpraj Kumar**.

It provides a simple and intuitive interface for interacting with AI
across a wide range of use cases including programming, education,
general knowledge, problem solving, and everyday questions.

AskGPT also provides **user authentication and persistent chat
history**, allowing users to securely save and access their
conversations.

---

## 🚀 Features

### 🤖 AI Assistant

- AI-powered conversations
- Natural and contextual responses
- Programming and coding assistance
- Educational assistance
- General knowledge support
- Current information and search support

### 🔐 Authentication

- User Sign Up
- User Sign In
- Secure password hashing
- Session-based authentication
- User-specific data
- Logout functionality

### 💬 Chat & History

- Create new conversations
- Continue previous conversations
- Persistent chat history
- User-specific conversations
- Delete conversations
- Conversation management

### 👤 User Profile

- Profile menu
- Profile information
- Account settings
- Sign In / Sign Up
- Logout

### 🎨 User Interface

- Modern ChatGPT-style interface
- Responsive design
- Clean sidebar
- Modern navigation
- Dark interface
- Smooth user experience
- Mobile-friendly layout

---

## 🧠 How It Works

```text
                    ┌───────────────┐
                    │     USER      │
                    └───────┬───────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │    AskGPT Frontend  │
                 │   React + TypeScript│
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │     Backend API     │
                 │   Node.js + Express │
                 └───────┬─────┬───────┘
                         │     │
              ┌──────────┘     └──────────┐
              ▼                           ▼
       ┌──────────────┐            ┌──────────────┐
       │     Auth     │            │  Gemini API  │
       │ Sign In/Up   │            │  AI Response │
       └──────┬───────┘            └──────┬───────┘
              │                           │
              └─────────────┬─────────────┘
                            ▼
                   ┌─────────────────┐
                   │   Prisma ORM    │
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ PostgreSQL /    │
                   │    Supabase     │
                   └─────────────────┘
