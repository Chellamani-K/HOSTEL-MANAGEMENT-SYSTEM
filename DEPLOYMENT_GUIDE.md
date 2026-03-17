# Deployment Guide for Realtime Data across Devices

Because you want *any device* (phones, laptops, etc.) to show realtime data, your website needs a **Centralized Database Server**. 
Right now, if you just upload your `index.html` to Netlify or GitHub Pages, it only runs static frontend code, and any data saved will stick only to the specific device's browser `localStorage` — meaning a phone can't see what the laptop did.

We've modified `js/api_client.js` so that when your frontend goes live, it will strictly talk to a **live backend server** instead of falling back to device storage.

## Follow these steps to deploy without errors:

### Step 1: Deploy your Python Backend `(backend_folder)` for Free
Since you already have a functional Python Flask backend (`backend/app.py`), we highly recommend **[PythonAnywhere](https://www.pythonanywhere.com/)** or **[Render](https://render.com/)**, which can host Python + SQLite databases for free.

**Using Render (Easiest)**
1. Create a GitHub account if you haven't, and upload this entire `final hms` folder as a repository.
2. Go to **[Render.com](https://render.com/)**, click **New > Web Service**.
3. Connect your GitHub repository.
4. Set the **Root Directory** to `backend`.
5. Set the **Start Command** to `gunicorn app:app`.
6. Once deployed, Render will give you a Live URL (e.g., `https://my-hostel-backend.onrender.com`).

Alternatively, using PythonAnywhere (best for saving database data permanently for free):
1. Sign up on [PythonAnywhere.com](https://www.pythonanywhere.com/).
2. Under "Web", click "Add a new web app" -> Choose "Flask" -> Select Python 3.10.
3. Replace the auto-generated Flask code with your `backend/app.py` contents and upload `database.py` and `hostel.db` using the "Files" tab.

### Step 2: Update the Live Backend Link in your Frontend
1. Open up `js/api_client.js`.
2. Look at **line 9**:
```javascript
const LIVE_API_BASE = 'https://YOUR-APP-NAME.onrender.com/api'; // <--- REPLACE THIS WITH YOUR DEPLOYED BACKEND URL
```
3. Change `'https://YOUR-APP-NAME.onrender.com/api'` to the real Live URL you got from Render or PythonAnywhere. Make sure it ends in `/api`.
4. Save the file.

### Step 3: Deploy the Frontend to Netlify or GitHub Pages
Now that your frontend code points your app to the internet server, you can deploy it!
1. Go to **[Netlify](https://www.netlify.com/)** or **GitHub Pages**.
2. Connect your repository (or drag and drop your frontend project files into Netlify Drop).
3. The live static link Netlify gives you will automatically use your deployed live backend URL server because of the code changes we made.

**Test It Out:**
- Log in to the Netlify site on your phone as a student. Send feedback.
- Log in to the same Netlify site on your laptop as an Admin. You will **immediately** see the feedback without reloading!
