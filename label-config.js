// Konfigurace pro dodací štítky
const LABEL_CONFIG = {
  // Velikost štítku (mm)
  size: {
    width: '100mm',
    height: '50mm',
    margin: '2mm'
  },
  
  // Barvy
  colors: {
    primary: '#6c5ce7',      // Hlavní barva (fialová)
    secondary: '#a29bfe',    // Sekundární barva (světle fialová)
    background: '#f8f9fa',   // Pozadí
    text: '#2d3436',         // Hlavní text
    textLight: '#636e72'     // Světlý text
  },
  
  // Logo
  logo: {
    size: '16mm',
    position: {
      top: '2mm',
      right: '2mm'
    },
    containerSize: {
      width: '20mm',
      height: '20mm'
    }
  },
  
  // Fonty
  fonts: {
    family: 'Arial, sans-serif',
    sizes: {
      header: '12px',
      customer: '12px',
      address: '10px',
      info: '8px',
      logo: '6px'
    }
  },
  
  // Pozice elementů
  layout: {
    header: {
      padding: '3mm',
      fontSize: '12px'
    },
    address: {
      padding: '3mm',
      marginRight: '22mm'
    },
    orderInfo: {
      position: {
        bottom: '2mm',
        right: '2mm'
      },
      padding: '2mm'
    }
  },
  
  // Texty
  texts: {
    header: 'DODACÍ ŠTÍTEK',
    logoText: 'Děti dětem',
    variableSymbol: 'VS:'
  }
};

// Funkce pro generování CSS z konfigurace
function generateLabelCSS(config) {
  return `
    @page {
      size: ${config.size.width} ${config.size.height};
      margin: ${config.size.margin};
    }
    
    body {
      font-family: ${config.fonts.family};
      font-size: ${config.fonts.sizes.address};
      margin: 0;
      padding: 0;
      width: calc(${config.size.width} - ${config.size.margin} * 2);
      height: calc(${config.size.height} - ${config.size.margin} * 2);
      border: 1px solid #000;
      box-sizing: border-box;
      background: linear-gradient(135deg, ${config.colors.background} 0%, #e9ecef 100%);
    }
    
    .label-header {
      background: linear-gradient(135deg, ${config.colors.primary} 0%, ${config.colors.secondary} 100%);
      color: white;
      padding: ${config.layout.header.padding};
      border-bottom: 2px solid ${config.colors.primary};
      font-weight: bold;
      text-align: center;
      font-size: ${config.layout.header.fontSize};
      text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
    }
    
    .logo-section {
      position: absolute;
      top: ${config.logo.position.top};
      right: ${config.logo.position.right};
      width: ${config.logo.containerSize.width};
      height: ${config.logo.containerSize.height};
      background: white;
      border: 2px solid ${config.colors.primary};
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .logo-section img {
      width: ${config.logo.size};
      height: ${config.logo.size};
      object-fit: contain;
    }
    
    .logo-text {
      font-size: ${config.fonts.sizes.logo};
      font-weight: bold;
      color: ${config.colors.primary};
      margin-top: 1mm;
    }
    
    .address {
      padding: ${config.layout.address.padding};
      line-height: 1.3;
      margin-right: ${config.layout.address.marginRight};
    }
    
    .customer-name {
      font-weight: bold;
      font-size: ${config.fonts.sizes.customer};
      margin-bottom: 1mm;
      color: ${config.colors.text};
    }
    
    .address-line {
      margin-bottom: 0.5mm;
      color: ${config.colors.textLight};
    }
    
    .city-zip {
      font-weight: bold;
      color: ${config.colors.text};
      font-size: ${config.fonts.sizes.address};
    }
    
    .order-info {
      position: absolute;
      bottom: ${config.layout.orderInfo.position.bottom};
      right: ${config.layout.orderInfo.position.right};
      font-size: ${config.fonts.sizes.info};
      color: ${config.colors.textLight};
      background: rgba(255,255,255,0.8);
      padding: ${config.layout.orderInfo.padding};
      border-radius: 4px;
      border: 1px solid #ddd;
    }
  `;
}

// Export pro použití v admin.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LABEL_CONFIG, generateLabelCSS };
}
