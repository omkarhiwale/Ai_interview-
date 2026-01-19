# omkar_hire_team - AI Voice Interviewer

An intelligent, voice-based interview platform powered by the Gemini 2.5 Live API. Upload your resume, engage in a 15-minute professional interview via voice, and receive a detailed performance analysis with scoring and recommendations.

## 🚀 Features

- **Voice Interaction**: Real-time, low-latency audio conversation using Gemini 2.5 Flash Native Audio.
- **Multimodal Resume Analysis**: Supports `.pdf` and `.txt` uploads. AI extracts professional context to tailor questions specifically to you.
- **Live Transcription**: Visual feedback of the conversation as it happens.
- **Performance Analytics**: Comprehensive scoring (0-100), feedback on strengths/weaknesses, and actionable recommendations.
- **Interactive UI**: Modern, glass-morphism design built with Tailwind CSS.

---

## 🛠️ Prerequisites

Before deploying, you need a **Gemini API Key** from Google AI Studio.

1.  Go to [Google AI Studio](https://aistudio.google.com/).
2.  Click on **"Get API key"**.
3.  Create a new API key in a new or existing project.
4.  **Copy this key**; you will need it for the deployment steps below.

---

## 🌐 Easy Deployment Steps

The easiest way to deploy this application is using **Vercel** or **Netlify**.

### Option 1: Deploy to Vercel (Recommended)

1.  **Push your code to GitHub**: Create a new repository and push all files.
2.  **Sign in to Vercel**: Go to [vercel.com](https://vercel.com/) and connect your GitHub account.
3.  **Import Project**: Select the `omkar_hire_team` repository.
4.  **Configure Environment Variables**:
    - Under the **"Environment Variables"** section, add a new variable.
    - **Name**: `API_KEY`
    - **Value**: Paste your Google Gemini API Key.
5.  **Deploy**: Click the **"Deploy"** button.
6.  Vercel will build and provide you with a live URL (e.g., `omkar-hire-team.vercel.app`).

### Option 2: Deploy to Netlify

1.  **Push your code to GitHub**.
2.  **Sign in to Netlify**: Go to [netlify.com](https://netlify.com/) and click **"Add new site"** > **"Import an existing project"**.
3.  **Connect GitHub**: Select your repository.
4.  **Site Configuration**:
    - Keep the build settings default (or set `npm run build` if you have a build script).
5.  **Add Environment Variable**:
    - Go to **Site Settings** > **Environment variables**.
    - Add a variable called `API_KEY` with your Gemini key.
6.  **Trigger Deploy**: Your site will be live on a `.netlify.app` domain.

---

## 💻 Local Development

If you want to run the project on your local machine:

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/omkar_hire_team.git
    cd omkar_hire_team
    ```
2.  **Set the API Key**:
    - Create a `.env` file in the root directory.
    - Add: `API_KEY=your_actual_api_key_here`
3.  **Serve the files**:
    Since this app uses ES6 modules directly in the HTML via `importmap`, you can use a simple dev server like Vite or Live Server:
    ```bash
    # Using Vite (Recommended for React/TS)
    npm install
    npm run dev
    ```

---

## ⚠️ Important Notes

- **Microphone Permissions**: Ensure your browser allows microphone access for the domain where the app is hosted.
- **Model Availability**: This app uses `gemini-2.5-flash-native-audio-preview-12-2025` for the live voice session. Ensure your API key has access to this model (standard in most regions via AI Studio).
- **Billing**: If using Veo or High-Quality models, ensure you have a billing-enabled GCP project if required by the specific SDK configuration.

---

**Developed by omkar_hire_team AI Systems**
Powered by Google Gemini API.
