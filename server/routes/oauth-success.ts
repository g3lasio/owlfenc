/**
 * 🎯 OAUTH SUCCESS HANDLER
 * Página de éxito que comunica resultados a ventana padre
 */

import { Router } from 'express';

const router = Router();

// Página de éxito para popup/iframe OAuth
router.get('/success', (req, res) => {
  const { user, token, state } = req.query;
  
  // HTML que comunica éxito a ventana padre
  const successHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Autenticación Exitosa</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .success-box {
            background: rgba(255,255,255,0.1);
            padding: 30px;
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
        .checkmark {
            font-size: 48px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="success-box">
        <div class="checkmark">✅</div>
        <h1>Autenticación Exitosa</h1>
        <p>Cerrando ventana...</p>
    </div>
    
    <script>
        // Enviar resultado a ventana padre
        if (window.opener) {
            window.opener.postMessage({
                type: 'OAUTH_SUCCESS',
                user: ${JSON.stringify(user || {})},
                token: '${token || ''}'
            }, window.location.origin);
            window.close();
        } else if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'OAUTH_SUCCESS',
                user: ${JSON.stringify(user || {})},
                token: '${token || ''}'
            }, window.location.origin);
        } else {
            // Fallback: redirigir a home
            window.location.href = '/';
        }
    </script>
</body>
</html>`;

  res.send(successHtml);
});

// Página de error para popup/iframe OAuth
router.get('/error', (req, res) => {
  const { error, message } = req.query;
  
  const errorHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Error de Autenticación</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px;
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            color: white;
        }
        .error-box {
            background: rgba(255,255,255,0.1);
            padding: 30px;
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
        .error-icon {
            font-size: 48px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="error-box">
        <div class="error-icon">❌</div>
        <h1>Error de Autenticación</h1>
        <p>${message || 'Error desconocido'}</p>
        <p>Cerrando ventana...</p>
    </div>
    
    <script>
        // Enviar error a ventana padre
        if (window.opener) {
            window.opener.postMessage({
                type: 'OAUTH_ERROR',
                error: '${error || 'unknown_error'}',
                message: '${message || 'Error desconocido'}'
            }, window.location.origin);
            window.close();
        } else if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'OAUTH_ERROR',
                error: '${error || 'unknown_error'}',
                message: '${message || 'Error desconocido'}'
            }, window.location.origin);
        } else {
            // Fallback: redirigir a login
            window.location.href = '/login';
        }
    </script>
</body>
</html>`;

  res.send(errorHtml);
});

export default router;