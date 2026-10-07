(function(root) {
  'use strict';
  root.PiPizzaCheckout = {
    create({cart, products, onComplete}) {
      const $ = selector => document.querySelector(selector);
      const dialog = $('#checkout-dialog');
      const form = $('#checkout-form');
      const address = $('#checkout-address');
      const results = $('#address-suggestions');
      const {paymentDetails, totals, scheduledSlots, isScheduledTimeValid, TIME_ZONE} = root.PiPizzaCheckoutModel;
      const money = value => new Intl.NumberFormat('cs-CZ',{style:'currency',currency:'CZK',minimumFractionDigits:Number.isInteger(value)?0:2,maximumFractionDigits:2}).format(value);
      const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
      const value = name => form.elements[name].value;
      let step=1, busy=false, completed=false, snapshot=null;
      const delivery = () => value('fulfillment') === 'delivery';
      const prices = () => totals(cart.total,value('payment'),Number(value('tip')));
      const estimate = () => root.PiDelivery.state;
      function renderDeliveryEstimate(){
        const state = estimate();
        const target = $('#checkout-delivery-estimate');
        target.hidden = !delivery();
        target.innerHTML = `<span class="delivery-squares" aria-hidden="true">${'<i></i>'.repeat(state.level)}</span><span><strong>${state.level === 1 ? '1 čtvereček' : '2 čtverečky'} · ${escape(state.label)}</strong><small>Orientační doba doručení podle vytížení rozvozu.</small></span>`;
        $('[name="timing"][value="asap"]').nextElementSibling.querySelector('small').textContent = delivery() ? state.label : 'cca 25 minut';
      }
      function refreshSlots(){
        const select = $('#scheduled-time');
        const previous = select.value;
        const slots = scheduledSlots();
        select.innerHTML = '<option value="">Vyberte den a čas</option>' + slots.map(slot=>`<option value="${slot.value}">${escape(slot.label)}</option>`).join('');
        if(slots.some(slot=>slot.value === previous)) select.value = previous;
      }
      function showError(message, input) {
        $('#checkout-error').textContent=message; $('#checkout-error').hidden=false;
        if(input){input.setAttribute('aria-invalid','true');input.focus();}
      }
      const addressPicker = root.PiDeliveryMap.bindAddress({input:address, results, clear:$('#address-clear'), status:$('#address-help'),
        onSelect: item => {
          $('#selected-address-text').textContent=item.label; $('#selected-address').hidden=false;
          address.removeAttribute('aria-invalid');
          root.PiDeliveryMap.showAddress($('#checkout-house-map'), item);
        },
        onInvalidate: () => {$('#selected-address').hidden=true;$('#checkout-house-map').hidden=true;}
      });
      const closeResults = () => addressPicker.close();
      form.addEventListener('input',event=>{event.target.removeAttribute('aria-invalid');$('#checkout-error').hidden=true;});
      function syncOptions(){
        $('#delivery-fields').hidden=!delivery(); $('#pickup-card').hidden=delivery(); address.required=delivery();
        const scheduled=value('timing')==='scheduled';$('#scheduled-time-label').hidden=!scheduled;$('#scheduled-time').required=scheduled;
        $('#checkout-tip').hidden=!paymentDetails(value('payment')).online;
        renderDeliveryEstimate();
        renderSummary();
      }
      form.addEventListener('change',event=>{if(event.target.name === 'timing')refreshSlots();syncOptions();});
      root.addEventListener('pi-delivery-change',()=>{
        renderDeliveryEstimate();
        if(step === 2 && !completed) $('#checkout-contact-review').innerHTML=contactText();
      });
      function contactText(){
        const when=value('timing')==='scheduled'?new Intl.DateTimeFormat('cs-CZ',{dateStyle:'short',timeStyle:'short',timeZone:TIME_ZONE}).format(new Date(value('scheduledTime')))+' · čas v ČR':delivery()?`Co nejdříve · ${estimate().label}`:'Co nejdříve · přibližně 25 min';
        return `<div>${icon(delivery()?'truck':'pin')}<p><strong>${delivery()?'Doručení':'Osobní vyzvednutí'}</strong><span>${escape(delivery()?address.value:'PiPizza, Jistebník 181, 742 82')}</span><small>${escape(when)}</small></p></div><div>${icon('phone')}<p><strong>${escape(value('customerName'))}</strong><span>${escape(value('phone'))} · ${escape(value('email'))}</span>${value('note').trim()?`<small>Poznámka: ${escape(value('note'))}</small>`:''}</p></div>`;
      }
      function renderSummary(){
        if(completed)return;
        const amount=prices();
        $('#checkout-item-count').textContent=`${cart.count}×`;
        $('#checkout-order-items').innerHTML=cart.items.map(line=>{
          const product=products.find(item=>item.id===line.productId);
          const half=line.halfProductId ? products.find(item=>item.id===line.halfProductId) : null;
          const name=half ? `${product.name} / ${half.name} · napůl` : product.name;
          const bases=root.PiPizzaCart.BASES;
          const baseText=line.base ? half ? `Základy: ${bases[line.base]} / ${bases[line.halfBase]}` : `${bases[line.base]} základ` : '';
          const changes=[baseText,...root.PiPizzaCart.describeChanges(line, product, products),line.note].filter(Boolean).join(' · ');
          return `<article>${product.image?`<img src="${escape(product.image)}" alt="" width="54" height="54">`:icon('box')}<div><strong>${line.quantity}× ${escape(name)}</strong>${changes?`<small>${escape(changes)}</small>`:''}</div><b>${money(line.unitPrice*line.quantity)}</b></article>`;
        }).join('');
        $('#checkout-costs').innerHTML=`<div><span>Za dobroty</span><strong>${money(amount.subtotal)}</strong></div><div><span>${delivery()?'Rozvoz':'Osobní vyzvednutí'}</span><strong class="free">Zdarma</strong></div><div><span>Krabice</span><strong class="free">V ceně pizzy</strong></div><div><span>Poplatek za platbu</span><strong class="free">0 Kč</strong></div>${amount.tip?`<div><span>Spropitné · dobrovolné</span><strong>${money(amount.tip)}</strong></div>`:''}<div class="summary-grand-total"><span>Celkem</span><strong>${money(amount.total)}</strong></div>`;
        $('#checkout-foot-total').textContent=money(amount.total);
        const method=paymentDetails(value('payment'));
        const next=$('#checkout-next');
        next.dataset.payment=step===2?value('payment'):'';
        next.setAttribute('aria-label',step===1?'Pokračovat k platbě':method.online?`Zaplatit ${method.logo ? 'přes ' + method.label : 'kartou'} – ${money(amount.total)}`:`Dokončit objednávku – ${money(amount.total)}`);
        next.innerHTML=step===1?`Pokračovat k platbě ${icon('arrow')}`:method.logo?`<span>Zaplatit s</span><img class="pay-button-logo" src="../assets/payments/${method.logo}.svg" alt=""><span class="pay-button-amount">${money(amount.total)}</span>`:method.online?`Zaplatit ${money(amount.total)} ${icon('card')}`:`Dokončit objednávku ${icon('arrow')}`;
      }
      function setStep(next){
        step=next; dialog.dataset.step=String(next);
        dialog.setAttribute('aria-labelledby',['','checkout-title','checkout-payment-title','checkout-success-title'][next]);
        dialog.querySelectorAll('[data-panel]').forEach(panel=>panel.hidden=Number(panel.dataset.panel)!==next);
        dialog.querySelectorAll('[data-checkout-step]').forEach(item=>{
          const current=Number(item.dataset.checkoutStep);item.classList.toggle('done',current<next);item.classList.toggle('active',current===next);
          if(current===next)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');
        });
        $('#checkout-back').hidden=next===3;$('#checkout-back').innerHTML=icon('arrow')+(next===1?' Zpět do košíku':' Zpět k údajům');
        if(next===2)$('#checkout-contact-review').innerHTML=contactText();
        if(next===3){$('#checkout-next').dataset.payment='';$('#checkout-next').setAttribute('aria-label','Zpět na nabídku');$('#checkout-next').innerHTML=`Zpět na nabídku ${icon('arrow')}`;$('#checkout-foot-total').textContent=money(snapshot.prices.total);}
        else renderSummary();
        closeResults(); dialog.scrollTo({top:0,behavior:'instant'});
        dialog.querySelector(`[data-panel="${next}"] h2`).focus({preventScroll:true});
      }
      function validate(){
        $('#checkout-error').hidden=true;
        const name=form.elements.customerName, phone=form.elements.phone;
        if(name.value.trim().length<2){showError('Doplňte prosím své jméno.',name);return false;}
        if(!/^\+?[\d\s()-]{9,20}$/.test(phone.value.trim())||phone.value.replace(/\D/g,'').length<9){showError('Zadejte prosím platné telefonní číslo.',phone);return false;}
        if(!validateSchedule())return false;
        const inputs=[...dialog.querySelectorAll('[data-panel="1"] input, [data-panel="1"] select')].filter(input=>input.required);
        for(const input of inputs){if(!input.checkValidity()){showError(input.type==='email'?'Zadejte prosím platný e-mail.':'Doplňte prosím všechna povinná pole.',input);return false;}}
        if(delivery()&&!addressPicker.selected()){showError('Vyberte prosím přesnou adresu z nabídky, abychom ověřili místo doručení.',address);return false;}
        return true;
      }
      function validateSchedule(){
        if(value('timing')==='scheduled' && !isScheduledTimeValid(value('scheduledTime'))){
          refreshSlots();
          if(step !== 1)setStep(1);
          showError('Vyberte platný čas alespoň 1 hodinu a 15 minut předem. Nabídku časů jsme aktualizovali.',$('#scheduled-time'));
          return false;
        }
        return true;
      }
      function finish(){
        if(busy||completed||!cart.count)return;
        if(!validateSchedule())return;
        busy=true; const button=$('#checkout-next');button.disabled=true;button.innerHTML='<span class="checkout-spinner"></span> '+(paymentDetails(value('payment')).online?'Potvrzuji platbu…':'Odesílám objednávku…');
        dialog.setAttribute('aria-busy','true');form.inert=true;$('#checkout-close').disabled=true;$('#checkout-back').disabled=true;
        snapshot={prices:prices(),payment:value('payment'),delivery:delivery(),contact:contactText()};
        // Deliberate demo delay only; no network, payment SDK, form submission or persistence.
        setTimeout(()=>{
          completed=true;busy=false;form.inert=false;dialog.removeAttribute('aria-busy');button.disabled=false;$('#checkout-close').disabled=false;$('#checkout-back').disabled=false;
          $('#demo-order-number').textContent='PP-'+new Date().toISOString().slice(5,10).replace('-','')+'-'+String(Math.floor(Math.random()*9000)+1000);
          $('#success-payment').innerHTML=icon('check')+`<span>${paymentDetails(snapshot.payment).success}<strong>${money(snapshot.prices.total)}</strong></span>`;
          $('#success-details').innerHTML=snapshot.contact;$('#success-last-step').textContent=snapshot.delivery?'Rozvážíme':'K vyzvednutí';
          cart.clear();onComplete();setStep(3);
        },1000);
      }
      form.addEventListener('submit',event=>{
        event.preventDefault();if(busy)return;
        if(step===1){if(validate())setStep(2);}else if(step===2)finish();else{dialog.close();document.querySelector('.brand').click();}
      });
      $('#checkout-back').addEventListener('click',()=>{if(step===2)setStep(1);else{dialog.close();$('#cart-dialog').showModal();}});
      $('#edit-checkout-contact').addEventListener('click',()=>setStep(1));
      $('#checkout-close').addEventListener('click',()=>{if(!busy)dialog.close();});
      dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
      dialog.addEventListener('close',()=>{closeResults();if(completed){form.reset();addressPicker.reset();$('#selected-address').hidden=true;$('#address-clear').hidden=true;}});
      $('#start-checkout').addEventListener('click',()=>{
        if(!cart.count)return;
        $('#cart-dialog').close();completed=false;snapshot=null;
        refreshSlots();
        $('#checkout-error').hidden=true;dialog.showModal();syncOptions();setStep(1);
      });
    }
  };
})(window);
