// Migrační skript pro přenesení objednávek z Google Sheets do Supabase
// Spustit v browser konzoli na admin stránce

async function migrateOrdersFromSheets() {
  console.log('🔄 Začínám migraci objednávek...');
  
  try {
    // 1. Načti data z Google Sheets (simulace - v reálném případě by to bylo přes API)
    const mockOrders = [
      {
        order_number: '20250101001',
        customer_name: 'Jan Novák',
        customer_email: 'jan.novak@email.cz',
        customer_phone: '+420 777 123 456',
        address_line: 'Hlavní 123',
        address_city: 'Praha',
        address_zip: '11000',
        amount: 138,
        vs: '1234567890',
        ss: '9876543210',
        payment_message: 'Děkuji za pomoc',
        delivery_note: 'Zvonit 2x',
        paid: false,
        timestamp: '2025-01-01T10:30:00Z',
        items: [
          { name: 'Náramek lásky', qty: 2, price: 69 }
        ]
      },
      {
        order_number: '20250101002',
        customer_name: 'Marie Svobodová',
        customer_email: 'marie.svobodova@email.cz',
        customer_phone: '+420 777 987 654',
        address_line: 'Náměstí 45',
        address_city: 'Brno',
        address_zip: '60200',
        amount: 207,
        vs: '1234567891',
        ss: '9876543211',
        payment_message: 'Pro děti v nouzi',
        delivery_note: 'Doručit do 17:00',
        paid: true,
        timestamp: '2025-01-01T14:15:00Z',
        items: [
          { name: 'Náramek naděje', qty: 3, price: 69 }
        ]
      }
    ];
    
    console.log(`📦 Načteno ${mockOrders.length} objednávek z Google Sheets`);
    
    // 2. Zkontroluj Supabase připojení
    if (!window.sb) {
      throw new Error('Supabase není inicializováno');
    }
    
    // 3. Migruj objednávky do Supabase
    let successCount = 0;
    let errorCount = 0;
    
    for (const order of mockOrders) {
      try {
        const { error } = await window.sb
          .from('orders')
          .insert({
            order_number: order.order_number,
            customer_name: order.customer_name,
            customer_email: order.customer_email,
            customer_phone: order.customer_phone,
            address_line: order.address_line,
            address_city: order.address_city,
            address_zip: order.address_zip,
            amount: order.amount,
            vs: order.vs,
            ss: order.ss,
            payment_message: order.payment_message,
            delivery_note: order.delivery_note,
            items: order.items,
            paid: order.paid,
            created_at: order.timestamp
          });
        
        if (error) {
          console.error(`❌ Chyba při migraci objednávky ${order.order_number}:`, error);
          errorCount++;
        } else {
          console.log(`✅ Migrována objednávka ${order.order_number}`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Chyba při migraci objednávky ${order.order_number}:`, err);
        errorCount++;
      }
    }
    
    console.log(`🎉 Migrace dokončena! Úspěšně: ${successCount}, Chyby: ${errorCount}`);
    
    // 4. Obnov admin stránku
    if (successCount > 0) {
      console.log('🔄 Obnovuji admin stránku...');
      window.location.reload();
    }
    
  } catch (error) {
    console.error('❌ Chyba při migraci:', error);
  }
}

// Spustit migraci
migrateOrdersFromSheets();
