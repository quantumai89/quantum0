# Vercel Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Push your code to GitHub
3. **Environment Variables**: Prepare your production API keys and URLs

## Deployment Steps

### 1. Connect to Vercel

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Select the repository containing this project

### 2. Configure Build Settings

Vercel should automatically detect this as a Vite project. If not, set:

- **Framework Preset**: Vite
- **Build Command**: `npm run vercel-build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3. Environment Variables

In the Vercel dashboard, go to your project settings and add these environment variables:

#### Required Variables
```
VITE_ENV=production
```

#### API Configuration
Update these with your actual production URLs:
```
VITE_API_URL=https://your-backend-api.vercel.app/api
VITE_AUTH_API_URL=https://your-backend-api.vercel.app/api
VITE_WAV2LIP_API_URL=https://your-backend-api.vercel.app
```

#### Optional Services (if using)
```
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_supabase_anon_key
VITE_ELEVENLABS_API_KEY=your-production-elevenlabs-api-key
VITE_ELEVENLABS_DEFAULT_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

### 4. Deploy

1. Click "Deploy" in Vercel
2. Wait for the build to complete
3. Your app will be available at `https://your-project-name.vercel.app`

## Backend Deployment

This project includes a Python Flask backend that needs to be deployed separately:

### Recommended: Deploy Backend to Railway/Render
1. Create a new project on [Railway](https://railway.app) or [Render](https://render.com)
2. Connect your GitHub repository
3. Set the root directory to `backend/`
4. Configure environment variables for the backend
5. Update frontend `VITE_*_API_URL` variables to point to your backend URL

### Alternative: Separate Vercel Project for Backend
1. Create a new Vercel project
2. Deploy only the `backend/` folder
3. Configure as a Node.js/Python function
4. Update API URLs in frontend environment variables

## Post-Deployment Checklist

- [ ] Frontend loads correctly
- [ ] Environment variables are set
- [ ] API endpoints are accessible
- [ ] Authentication works (if implemented)
- [ ] All features function as expected
- [ ] Custom domain configured (optional)

## Troubleshooting

### Build Failures
- Check that all dependencies are in `package.json`
- Ensure TypeScript types are correct
- Verify environment variables are set

### Runtime Errors
- Check browser console for errors
- Verify API URLs are correct
- Ensure CORS is configured on backend

### Performance Issues
- Enable gzip compression (automatic on Vercel)
- Optimize images and assets
- Use code splitting (already configured)

## Custom Domain (Optional)

1. Go to your project settings in Vercel
2. Click "Domains"
3. Add your custom domain
4. Configure DNS records as instructed

## Monitoring

- Use Vercel Analytics for performance monitoring
- Set up error tracking (Sentry, LogRocket, etc.)
- Monitor API usage and costs

## Security

- Never commit `.env` files with real secrets
- Use Vercel's environment variables for sensitive data
- Enable HTTPS (automatic on Vercel)
- Configure proper CORS headers on your backend