# Deployment Guide - TravaCasa

## 🚀 Production Readiness Checklist

### ✅ Fixed Issues
- ✅ Environment variable validation added
- ✅ Session cookie security enhanced (secure, sameSite)
- ✅ Rate limiting implemented for API endpoints
- ✅ Production start script fixed
- ✅ Ollama URL configuration improved

### ⚠️ Pre-Deployment Requirements

#### 1. Environment Variables
Create a `.env` file with the following **REQUIRED** variables:

```env
# REQUIRED - MongoDB Atlas Connection
ATLASDB_URL=mongodb+srv://username:password@cluster.mongodb.net/database_name?retryWrites=true&w=majority

# REQUIRED - Session Secret (Generate a strong random string)
SECRET=your_super_secret_session_key_generate_random_string_here

# REQUIRED - Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# OPTIONAL - Google Maps API Key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# OPTIONAL - Ollama Configuration (for local AI)
OLLAMA_BASE_URL=http://your-ollama-server:11434

# OPTIONAL - Hugging Face API Key (for AI fallback)
HUGGINGFACE_API_KEY=your_huggingface_api_key

# OPTIONAL - Server Port (defaults to 3000)
PORT=3000

# REQUIRED FOR PRODUCTION - Set to 'production'
NODE_ENV=production
```

#### 2. Generate Strong Session Secret
Run this command to generate a secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 3. MongoDB Atlas Configuration
- ✅ Ensure your MongoDB Atlas cluster is running
- ✅ Add your deployment server's IP to MongoDB Atlas IP whitelist (or use 0.0.0.0/0 for all IPs)
- ✅ Verify database connection string is correct

#### 4. Cloudinary Setup
- ✅ Create a Cloudinary account
- ✅ Get your cloud name, API key, and API secret
- ✅ Add them to `.env` file

### 📦 Deployment Steps

#### For Heroku/Render/DigitalOcean:

1. **Install Dependencies:**
   ```bash
   npm install --production
   ```

2. **Set Environment Variables:**
   - Add all required environment variables in your hosting platform's dashboard
   - **IMPORTANT:** Set `NODE_ENV=production`

3. **Start the Application:**
   ```bash
   npm start
   ```
   (The start script now uses `node` instead of `nodemon` for production)

4. **Verify Deployment:**
   - Check database connection logs
   - Test API endpoints
   - Verify chatbot functionality

### 🔒 Security Checklist

- ✅ Session cookies are secure in production (`secure: true` when `NODE_ENV=production`)
- ✅ Rate limiting enabled (100 requests/15min for API, 10 requests/min for chatbot)
- ✅ Environment variables validated on startup
- ✅ HTTP-only cookies enabled
- ✅ SameSite cookie protection enabled
- ⚠️ **TODO:** Consider adding Helmet.js for additional security headers
- ⚠️ **TODO:** Set up HTTPS/SSL certificate (required for secure cookies)

### ⚠️ Known Limitations

1. **Ollama Dependency:**
   - If using Ollama for AI, ensure it's accessible from your deployment server
   - Consider using a cloud-hosted Ollama instance or Hugging Face fallback

2. **File Uploads:**
   - Currently using Cloudinary (good for production)
   - Ensure Cloudinary account has sufficient storage/quota

3. **Error Handling:**
   - Basic error handling implemented
   - Consider adding error tracking service (Sentry, etc.) for production

### 🧪 Testing Before Deployment

1. **Test Environment Variables:**
   ```bash
   node -e "require('dotenv').config(); console.log('DB:', process.env.ATLASDB_URL ? 'Set' : 'Missing'); console.log('Secret:', process.env.SECRET ? 'Set' : 'Missing');"
   ```

2. **Test Database Connection:**
   - Start server and verify MongoDB connection logs

3. **Test API Endpoints:**
   - Test `/api/chatbot` endpoint
   - Test property listing endpoints
   - Verify rate limiting works

### 📝 Post-Deployment

1. Monitor application logs for errors
2. Check database connection stability
3. Monitor API usage and rate limits
4. Set up monitoring/alerting (optional but recommended)

### 🆘 Troubleshooting

**Database Connection Issues:**
- Verify `ATLASDB_URL` is correct
- Check MongoDB Atlas IP whitelist
- Ensure network connectivity

**Session Issues:**
- Verify `SECRET` is set and strong
- Check cookie settings match your domain
- Ensure HTTPS is enabled for secure cookies

**Rate Limiting:**
- Adjust limits in `app.js` if needed
- Monitor for false positives

---

**Status:** ✅ **READY FOR DEPLOYMENT** (with proper environment configuration)

