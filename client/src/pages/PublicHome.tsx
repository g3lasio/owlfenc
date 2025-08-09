import React from 'react';
import { Link } from 'wouter';

const PublicHome = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Owl Fence
          </h1>
          <p className="text-2xl text-gray-300 mb-8">
            Gestión Inteligente de Proyectos para Contratistas
          </p>
          <div className="space-x-4">
            <Link href="/login">
              <a className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105">
                Iniciar Sesión
              </a>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white/10 backdrop-blur-md rounded-lg border border-cyan-500/30 p-6 text-center">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold text-cyan-400 mb-3">IA Avanzada</h3>
            <p className="text-gray-300">
              Asistente AI Mervin para estimaciones precisas y gestión inteligente de proyectos.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-lg border border-cyan-500/30 p-6 text-center">
            <div className="text-4xl mb-4">📄</div>
            <h3 className="text-xl font-semibold text-cyan-400 mb-3">Contratos Profesionales</h3>
            <p className="text-gray-300">
              Generación automática de contratos legales con firma digital integrada.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-lg border border-cyan-500/30 p-6 text-center">
            <div className="text-4xl mb-4">💳</div>
            <h3 className="text-xl font-semibold text-cyan-400 mb-3">Pagos Seguros</h3>
            <p className="text-gray-300">
              Integración con Stripe para procesamiento seguro de pagos y seguimiento.
            </p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-lg border border-cyan-500/30 p-8 text-center">
          <h2 className="text-3xl font-bold text-cyan-400 mb-4">
            Plataforma Completa para Contratistas
          </h2>
          <p className="text-gray-300 text-lg mb-6 max-w-3xl mx-auto">
            Revoluciona tu negocio de construcción con nuestra plataforma integral que combina 
            inteligencia artificial, automatización y herramientas especializadas para 
            contratistas de cercas y construcción.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="text-cyan-400 font-semibold mb-2">Estimaciones</h4>
              <p className="text-gray-400 text-sm">IA conversacional para cálculos precisos</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="text-cyan-400 font-semibold mb-2">Gestión de Proyectos</h4>
              <p className="text-gray-400 text-sm">Timeline interactivo y seguimiento</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="text-cyan-400 font-semibold mb-2">Verificación Legal</h4>
              <p className="text-gray-400 text-sm">Verificación de propiedades con ATTOM</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="text-cyan-400 font-semibold mb-2">Multi-tenant</h4>
              <p className="text-gray-400 text-sm">Separación segura de datos</p>
            </div>
          </div>
        </div>

        <footer className="mt-12 pt-8 border-t border-gray-700 text-center text-gray-400">
          <div className="space-x-4">
            <Link href="/privacy-policy">
              <a className="hover:text-cyan-400 transition-colors">Privacy Policy</a>
            </Link>
            <Link href="/terms-of-service">
              <a className="hover:text-cyan-400 transition-colors">Terms of Service</a>
            </Link>
            <Link href="/about-owlfenc">
              <a className="hover:text-cyan-400 transition-colors">About Owl Fence</a>
            </Link>
          </div>
          <p className="mt-4">© 2025 Owl Fence. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default PublicHome;