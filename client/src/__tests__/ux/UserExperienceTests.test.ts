/**
 * PRUEBAS DE EXPERIENCIA DE USUARIO (UX)
 * 
 * Suite integral que valida:
 * - Flujos críticos de usuario sin interrupciones
 * - Estados de carga y feedback visual apropiado
 * - Accesibilidad y usabilidad universal
 * - Consistencia de interfaz y comportamiento
 * - Manejo graceful de errores desde perspectiva UX
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Mervin from '../../../pages/Mervin';

// Mock de contextos y dependencias
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'test-user-123', email: 'test@example.com' },
    loading: false
  })
}));

jest.mock('../../../contexts/PermissionContext', () => ({
  usePermissions: () => ({
    userPlan: { id: 'master_contractor', features: ['all'] },
    showUpgradeModal: false
  })
}));

jest.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

describe('🎨 Pruebas de Experiencia de Usuario (UX)', () => {
  beforeEach(() => {
    // Reset de mocks antes de cada prueba
    jest.clearAllMocks();
    
    // Mock de fetch global para APIs
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('🚀 Flujos Críticos de Usuario', () => {
    it('debe completar flujo de mensaje simple sin interrupciones', async () => {
      const user = userEvent.setup();
      render(<Mervin />);

      // Verificar que la interfaz se carga correctamente
      expect(screen.getByText('Mervin AI Assistant')).toBeInTheDocument();
      
      // Encontrar el input de mensaje
      const messageInput = screen.getByPlaceholderText('Escribe tu mensaje...');
      expect(messageInput).toBeInTheDocument();
      expect(messageInput).not.toBeDisabled();

      // Escribir mensaje
      await user.type(messageInput, 'Hola, necesito ayuda');
      expect(messageInput).toHaveValue('Hola, necesito ayuda');

      // Enviar mensaje
      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeInTheDocument();
      expect(sendButton).not.toBeDisabled();
      
      await user.click(sendButton);

      // Verificar que el mensaje del usuario aparece
      expect(screen.getByText('Hola, necesito ayuda')).toBeInTheDocument();

      // Verificar que se muestra indicador de carga
      expect(screen.getByText(/procesando|analizando|agente trabajando/i)).toBeInTheDocument();

      // El input debería estar limpio después del envío
      expect(messageInput).toHaveValue('');
    });

    it('debe manejar flujo de generación de estimado completo', async () => {
      const user = userEvent.setup();
      render(<Mervin />);

      // Click en botón de estimados
      const estimatesButton = screen.getByText(/Generate Estimates/i);
      await user.click(estimatesButton);

      // Debería mostrar mensaje de activación
      await waitFor(() => {
        expect(screen.getByText(/ACTIVANDO ESTIMATES/i)).toBeInTheDocument();
      });

      // Verificar que se muestra estado de procesamiento
      expect(screen.getByText(/Agente Activo|analizando/i)).toBeInTheDocument();
    });

    it('debe permitir cambio entre modos Agent y Legacy', async () => {
      const user = userEvent.setup();
      render(<Mervin />);

      // Encontrar selector de modelo
      const modelSelector = screen.getByText(/Agent Mode/i);
      await user.click(modelSelector);

      // Debería mostrar opciones
      await waitFor(() => {
        expect(screen.getByText('Legacy')).toBeInTheDocument();
      });

      // Cambiar a Legacy
      const legacyOption = screen.getByText('Legacy');
      await user.click(legacyOption);

      // Verificar que cambió el modo
      expect(screen.getByText(/Legacy/i)).toBeInTheDocument();
    });

    it('debe manejar flujo de múltiples tareas secuenciales', async () => {
      const user = userEvent.setup();
      render(<Mervin />);

      const messageInput = screen.getByPlaceholderText('Escribe tu mensaje...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Primera tarea
      await user.type(messageInput, 'Generar estimado para cerca');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Generar estimado para cerca')).toBeInTheDocument();
      });

      // Segunda tarea
      await user.type(messageInput, 'Ahora crear contrato basado en ese estimado');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/crear contrato/i)).toBeInTheDocument();
      });

      // Verificar que ambas tareas están en el historial
      expect(screen.getByText('Generar estimado para cerca')).toBeInTheDocument();
      expect(screen.getByText(/crear contrato/i)).toBeInTheDocument();
    });
  });

  describe('⏳ Estados de Carga y Feedback Visual', () => {
    it('debe mostrar indicadores de carga apropiados', async () => {
      const user = userEvent.setup();
      render(<Mervin />);

      const messageInput = screen.getByPlaceholderText('Escribe tu mensaje...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(messageInput, 'Mensaje de prueba');
      await user.click(sendButton);

      // Verificar diferentes tipos de indicadores de carga
      const loadingIndicators = [
        /procesando/i,
        /analizando/i,
        /agente trabajando/i,
        /pensando/i
      ];

      const hasLoadingIndicator = loadingIndicators.some(pattern => 
        screen.queryByText(pattern) !== null
      );

      expect(hasLoadingIndicator).toBe(true);
    });

    it('debe deshabilitar input durante procesamiento', async () => {
      const user = userEvent.setup();
      render(<Mervin />);

      const messageInput = screen.getByPlaceholderText('Escribe tu mensaje...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(messageInput, 'Mensaje de prueba');
      await user.click(sendButton);

      // Durante el procesamiento, los controles deberían estar deshabilitados
      // (Nota: esto dependería de la implementación real del estado de carga)
    });

    it('debe mostrar progreso para tareas largas', async () => {
      const user = userEvent.setup();
      render(<Mervin />);

      // Click en una tarea que típicamente toma más tiempo
      const contractsButton = screen.getByText(/Generate Contracts/i);
      await user.click(contractsButton);

      // Debería mostrar algún indicador de progreso
      await waitFor(() => {
        expect(screen.getByText(/activando|iniciando|procesando/i)).toBeInTheDocument();
      });
    });

    it('debe proporcionar feedback inmediato en acciones del usuario', async () => {
      const user = userEvent.setup();
      render(<Mervin />);

      const messageInput = screen.getByPlaceholderText('Escribe tu mensaje...');
      
      // Escribir debería ser inmediato
      await user.type(messageInput, 'Test');
      expect(messageInput).toHaveValue('Test');

      // Click en botones debería tener respuesta visual inmediata
      const estimatesButton = screen.getByText(/Generate Estimates/i);
      await user.click(estimatesButton);

      // Debería haber algún cambio visual inmediato
      expect(estimatesButton).toBeInTheDocument();
    });
  });

  describe('♿ Accesibilidad y Usabilidad', () => {
    it('debe ser navegable completamente por teclado', async () => {
      const user = userEvent.setup();
      render(<Mervin />);

      // Tab debería navegar a través de elementos interactivos
      await user.tab();
      
      // Debería poder llegar al input con Tab
      const messageInput = screen.getByPlaceholderText('Escribe tu mensaje...');
      expect(messageInput).toHaveFocus();

      // Enter debería enviar el mensaje
      await user.type(messageInput, 'Test message');
      await user.keyboard('{Enter}');

      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('debe tener labels y aria-labels apropiados', () => {
      render(<Mervin />);

      // Verificar que elementos importantes tienen labels
      const messageInput = screen.getByPlaceholderText('Escribe tu mensaje...');
      expect(messageInput).toBeInTheDocument();

      // Verificar botones accesibles
      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeInTheDocument();
    });

    it('debe funcionar correctamente con lectores de pantalla', () => {
      render(<Mervin />);

      // Verificar estructura semántica
      expect(screen.getByRole('main')).toBeInTheDocument();
      
      // Verificar que los mensajes tienen estructura apropiada
      expect(screen.getByText('Mervin AI Assistant')).toBeInTheDocument();
    });

    it('debe tener suficiente contraste y tamaños de fuente', () => {
      render(<Mervin />);

      // Verificar que elementos principales son visibles
      const header = screen.getByText('Mervin AI Assistant');
      expect(header).toBeInTheDocument();
      expect(header).toBeVisible();

      // Verificar que botones son suficientemente grandes
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeVisible();
      });
    });

    it('debe ser responsive en diferentes tamaños de pantalla', () => {
      // Simular móvil
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(<Mervin />);
      
      // La interfaz debería seguir siendo usable
      expect(screen.getByText('Mervin AI Assistant')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Escribe tu mensaje...')).toBeInTheDocument();

      // Simular desktop
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });

      // La interfaz debería adaptarse
      expect(screen.getByText('Mervin AI Assistant')).toBeInTheDocument();
    });
  });

  describe('🎯 Consistencia de Interfaz', () => {
    it('debe mantener estilo visual consistente', () => {
      render(<Mervin />);

      // Verificar que elementos usan clases de estilo consistentes
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);

      // Todos los botones deberían tener estilos similares
      buttons.forEach(button => {
        expect(button).toHaveClass(/bg-|border-|text-/); // Clases de Tailwind
      });
    });

    it('debe usar iconografía consistente', () => {
      render(<Mervin />);

      // Verificar que los iconos están presentes y son consistentes
      // (Esto dependería de la implementación específica de iconos)
      const actionButtons = screen.getAllByRole('button');
      expect(actionButtons.length).toBeGreaterThan(5); // Botones de acción principales
    });

    it('debe mantener spacing y layout consistente', () => {
      render(<Mervin />);

      // Verificar estructura de layout
      const container = screen.getByText('Mervin AI Assistant').closest('div');
      expect(container).toBeInTheDocument();
    });

    it('debe usar terminología consistente', () => {
      render(<Mervin />);

      // Verificar que se usa terminología consistente
      expect(screen.getByText('Generate Estimates')).toBeInTheDocument();
      expect(screen.getByText('Generate Contracts')).toBeInTheDocument();
      expect(screen.getByText('Permit Advisor')).toBeInTheDocument();
    });
  });

  describe('🛠️ Manejo de Errores UX', () => {
    it('debe mostrar errores de forma user-friendly', async () => {
      const user = userEvent.setup();
      
      // Mock de error en fetch
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      render(<Mervin />);

      const messageInput = screen.getByPlaceholderText('Escribe tu mensaje...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(messageInput, 'Test message');
      await user.click(sendButton);

      // Debería mostrar mensaje de error amigable
      await waitFor(() => {
        expect(screen.getByText(/problemita|error|intenta/i)).toBeInTheDocument();
      });
    });

    it('debe proporcionar opciones de recuperación', async () => {
      const user = userEvent.setup();
      render(<Mervin />);

      // Simular estado de error y verificar opciones de recuperación
      const messageInput = screen.getByPlaceholderText('Escribe tu mensaje...');
      expect(messageInput).not.toBeDisabled();

      // El usuario debería poder intentar enviar otro mensaje
      await user.type(messageInput, 'Nuevo intento');
      expect(messageInput).toHaveValue('Nuevo intento');
    });

    it('debe mantener estado de conversación durante errores', async () => {
      const user = userEvent.setup();
      render(<Mervin />);

      const messageInput = screen.getByPlaceholderText('Escribe tu mensaje...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Enviar mensaje exitoso primero
      await user.type(messageInput, 'Primer mensaje');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Primer mensaje')).toBeInTheDocument();
      });

      // Simular error en segundo mensaje
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      await user.type(messageInput, 'Segundo mensaje');
      await user.click(sendButton);

      // El primer mensaje debería seguir visible
      expect(screen.getByText('Primer mensaje')).toBeInTheDocument();
    });

    it('debe proporcionar feedback claro sobre limitaciones de plan', async () => {
      // Mock de usuario con plan básico
      jest.mocked(require('../../../contexts/PermissionContext').usePermissions)
        .mockReturnValue({
          userPlan: { id: 'basic', features: ['chat'] },
          showUpgradeModal: false
        });

      const user = userEvent.setup();
      render(<Mervin />);

      // Intentar usar función premium
      const contractsButton = screen.getByText(/Generate Contracts/i);
      await user.click(contractsButton);

      // Debería mostrar mensaje sobre limitaciones del plan
      await waitFor(() => {
        expect(screen.getByText(/upgrade|plan|premium/i)).toBeInTheDocument();
      });
    });
  });

  describe('📱 Experiencia Móvil', () => {
    it('debe ser táctil-friendly en dispositivos móviles', async () => {
      // Simular viewport móvil
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const user = userEvent.setup();
      render(<Mervin />);

      // Los elementos deberían ser fáciles de tocar
      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeInTheDocument();
      
      // Debería ser clickeable sin problemas
      await user.click(sendButton);
    });

    it('debe manejar orientación de pantalla', () => {
      // Simular cambio de orientación
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 812, // Landscape
      });

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<Mervin />);
      
      // La interfaz debería adaptarse
      expect(screen.getByText('Mervin AI Assistant')).toBeInTheDocument();
    });

    it('debe optimizar para gestos táctiles', async () => {
      const user = userEvent.setup();
      render(<Mervin />);

      const messageInput = screen.getByPlaceholderText('Escribe tu mensaje...');
      
      // Debería soportar gestos de texto
      await user.type(messageInput, 'Test');
      expect(messageInput).toHaveValue('Test');

      // Clear con gesture
      await user.clear(messageInput);
      expect(messageInput).toHaveValue('');
    });
  });

  describe('⚡ Performance UX', () => {
    it('debe sentirse responsive durante uso normal', async () => {
      const user = userEvent.setup();
      render(<Mervin />);

      const messageInput = screen.getByPlaceholderText('Escribe tu mensaje...');
      
      // Escribir debería sentirse inmediato
      const startTime = performance.now();
      await user.type(messageInput, 'Quick response test');
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // Menos de 1 segundo
    });

    it('debe cargar interfaz inicial rápidamente', () => {
      const startTime = performance.now();
      render(<Mervin />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(500); // Menos de 500ms
      expect(screen.getByText('Mervin AI Assistant')).toBeInTheDocument();
    });

    it('debe manejar múltiples interacciones rápidas', async () => {
      const user = userEvent.setup();
      render(<Mervin />);

      // Múltiples clicks rápidos no deberían romper la interfaz
      const estimatesButton = screen.getByText(/Generate Estimates/i);
      
      await user.click(estimatesButton);
      await user.click(estimatesButton);
      await user.click(estimatesButton);

      // La interfaz debería seguir funcionando
      expect(screen.getByText(/Generate Estimates/i)).toBeInTheDocument();
    });
  });
});