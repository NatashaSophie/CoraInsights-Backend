/**
 * Injeta botão "Ver Mapa" na interface do Trail Route
 */

(function() {
  'use strict';
  
  // Função para adicionar botão
  function addMapButton() {
    // Verificar se estamos na página de Trail Route
    const url = window.location.href;
    if (!url.includes('/trail-route.trail-route/')) {
      return;
    }
    
    // Extrair ID da URL
    const match = url.match(/\/trail-route\.trail-route\/(\d+)/);
    if (!match) {
      return;
    }
    
    const trailRouteId = match[1];
    
    // Verificar se o botão já existe
    if (document.getElementById('view-map-button')) {
      return;
    }
    
    // Encontrar o container principal
    const container = document.querySelector('[class*="Container"]');
    if (!container) {
      return;
    }
    
    // Criar botão
    const button = document.createElement('a');
    button.id = 'view-map-button';
    button.href = `/trail-route-map.html?id=${trailRouteId}`;
    button.target = '_blank';
    button.innerHTML = '🗺️ Ver Mapa GPS';
    button.style.cssText = `
      display: inline-block;
      padding: 10px 20px;
      background: #007bff;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      font-weight: bold;
      margin: 10px 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      transition: all 0.2s;
    `;
    
    button.onmouseover = function() {
      this.style.background = '#0056b3';
      this.style.transform = 'translateY(-2px)';
      this.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
    };
    
    button.onmouseout = function() {
      this.style.background = '#007bff';
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    };
    
    // Inserir botão no topo do container
    container.insertBefore(button, container.firstChild);
  }
  
  // Executar quando a página carregar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addMapButton);
  } else {
    addMapButton();
  }
  
  // Observar mudanças na URL (para Single Page Applications)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(addMapButton, 500);
    }
  }).observe(document, { subtree: true, childList: true });
  
})();
