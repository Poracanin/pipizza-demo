(function(root) {
  'use strict';
  root.PiPizzaCheckout = {
    create({cart, products, onComplete}) {
      const $ = selector => document.querySelector(selector);
      const dialog = $('#checkout-dialog');
      const form = $('#checkout-form');
      const address = $('#checkout-address');
      const results = $('#address-suggestions');
      const {searchAddresses, totals} = root.PiPizzaCheckoutModel;
      const money = value => new Intl.NumberFormat('cs-CZ',{style:'currency',currency:'CZK',minimumFractionDigits:Number.isInteger(value)?0:2,maximumFractionDigits:2}).format(value);
      const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
      const value = name => form.elements[name].value;
      let step=1, busy=false, completed=false, snapshot=null, activeOption=-1, suggestions=[];
      const delivery = () => value('fulfillment') === 'delivery';
      const prices = () => totals(cart.total,value('payment'),Number(value('tip')));
      function showError(message, input) {
        $('#checkout-error').textContent=message; $('#checkout-error').hidden=false;
        if(input){input.setAttribute('aria-invalid','true');input.focus();}
      }
      function closeResults(){results.hidden=true;address.setAttribute('aria-expanded','false');address.removeAttribute('aria-activedescendant');activeOption=-1;}
      function chooseAddress(index){
        address.value=suggestions[index]; closeResults(); $('#address-clear').hidden=false;
        $('#selected-address-text').textContent=address.value; $('#selected-address').hidden=false;
        address.removeAttribute('aria-invalid'); address.focus();
      }
      function renderAddresses(){
        suggestions=searchAddresses(address.value); activeOption=-1; address.removeAttribute('aria-activedescendant');
        results.innerHTML=suggestions.length?suggestions.map((item,index)=>`<button type="button" role="option" aria-selected="false" id="address-option-${index}" data-address="${index}">${icon('pin')}<span>${escape(item)}<small>Ukázková adresa · rozvoz zdarma</small></span>${icon('arrow')}</button>`).join(''):'<p>Adresu můžete napsat celou ručně. Pro demo ji přijmeme bez ověřování.</p>';
        results.hidden=false; address.setAttribute('aria-expanded','true');
      }
      address.addEventListener('input',()=>{$('#selected-address').hidden=true;$('#address-clear').hidden=!address.value;renderAddresses();});
      address.addEventListener('focus',renderAddresses);
      address.addEventListener('keydown',event=>{
        if(event.key==='Escape'){if(!results.hidden){event.preventDefault();event.stopPropagation();closeResults();}return;}
        if(event.key==='ArrowDown'||event.key==='ArrowUp'){
          event.preventDefault();if(results.hidden)renderAddresses();if(!suggestions.length)return;
          activeOption=(activeOption+(event.key==='ArrowDown'?1:-1)+suggestions.length)%suggestions.length;
          results.querySelectorAll('[role=option]').forEach((option,index)=>option.setAttribute('aria-selected',String(index===activeOption)));
          address.setAttribute('aria-activedescendant',`address-option-${activeOption}`);
        }
        if(event.key==='Enter'&&!results.hidden&&activeOption>=0){event.preventDefault();chooseAddress(activeOption);closeResults();}
      });
      results.addEventListener('click',event=>{const option=event.target.closest('[data-address]');if(option){chooseAddress(Number(option.dataset.address));closeResults();}});
      $('#address-clear').addEventListener('click',()=>{address.value='';$('#selected-address').hidden=true;$('#address-clear').hidden=true;address.focus();renderAddresses();});
      dialog.addEventListener('click',event=>{if(!event.target.closest('.address-wrap'))closeResults();});
      form.addEventListener('input',event=>{event.target.removeAttribute('aria-invalid');$('#checkout-error').hidden=true;});
      function syncOptions(){
        $('#delivery-fields').hidden=!delivery(); $('#pickup-card').hidden=delivery(); address.required=delivery();
        const scheduled=value('timing')==='scheduled';$('#scheduled-time-label').hidden=!scheduled;$('#scheduled-time').required=scheduled;
        const online=value('payment')==='card';$('#demo-card-panel').hidden=!online;$('#checkout-tip').hidden=!online;
        renderSummary();
      }
      form.addEventListener('change',syncOptions);
      function contactText(){
        const when=value('timing')==='scheduled'?new Intl.DateTimeFormat('cs-CZ',{dateStyle:'short',timeStyle:'short'}).format(new Date(value('scheduledTime'))):delivery()?'Co nejdříve · přibližně 40–60 min':'Co nejdříve · přibližně 25 min';
        return `<div>${icon(delivery()?'truck':'pin')}<p><strong>${delivery()?'Doručení':'Osobní vyzvednutí'}</strong><span>${escape(delivery()?address.value:'PiPizza, Jistebník 181, 742 82')}</span><small>${escape(when)} · demo</small></p></div><div>${icon('phone')}<p><strong>${escape(value('customerName'))}</strong><span>${escape(value('phone'))} · ${escape(value('email'))}</span>${value('note').trim()?`<small>Poznámka: ${escape(value('note'))}</small>`:''}</p></div>`;
      }
      function renderSummary(){
        if(completed)return;
        const amount=prices();
        $('#checkout-item-count').textContent=`${cart.count}×`;
        $('#checkout-order-items').innerHTML=cart.items.map(line=>{
          const product=products.find(item=>item.id===line.productId);
          const changes=[line.removed.length?'Bez: '+line.removed.join(', '):'',line.extras.length?'Navíc: '+line.extras.join(', '):'',line.note].filter(Boolean).join(' · ');
          return `<article>${product.image?`<img src="${escape(product.image)}" alt="" width="54" height="54">`:icon('box')}<div><strong>${line.quantity}× ${escape(product.name)}</strong>${changes?`<small>${escape(changes)}</small>`:''}</div><b>${money(line.unitPrice*line.quantity)}</b></article>`;
        }).join('');
        $('#checkout-costs').innerHTML=`<div><span>Za dobroty</span><strong>${money(amount.subtotal)}</strong></div><div><span>${delivery()?'Rozvoz':'Osobní vyzvednutí'}</span><strong class="free">Zdarma</strong></div><div><span>Krabice</span><strong class="free">Zdarma</strong></div>${amount.cardFee?`<div><span>Platba kartou <small>1,49 %</small></span><strong>${money(amount.cardFee)}</strong></div>`:''}${amount.tip?`<div><span>Spropitné</span><strong>${money(amount.tip)}</strong></div>`:''}<div class="summary-grand-total"><span>Celkem</span><strong>${money(amount.total)}</strong></div>`;
        $('#checkout-foot-total').textContent=money(amount.total);
        $('#checkout-next').innerHTML=step===1?`Pokračovat k platbě ${icon('arrow')}`:value('payment')==='card'?`Zaplatit ${money(amount.total)} · demo ${icon('card')}`:`Odeslat demo objednávku ${icon('arrow')}`;
      }
      function setStep(next){
        step=next; dialog.dataset.step=String(next);
        dialog.setAttribute('aria-labelledby',['','checkout-title','checkout-payment-title','checkout-success-title'][next]);
        dialog.querySelectorAll('[data-panel]').forEach(panel=>panel.hidden=Number(panel.dataset.panel)!==next);
        dialog.querySelectorAll('[data-checkout-step]').forEach(item=>{
          const current=Number(item.dataset.checkoutStep);item.classList.toggle('done',current<next);item.classList.toggle('active',current===next);
          if(current===next)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');
        });
        $('#checkout-back').hidden=next===3;$('#checkout-back').textContent=next===1?'← Zpět do košíku':'← Zpět k údajům';
        if(next===2)$('#checkout-contact-review').innerHTML=contactText();
        if(next===3){$('#checkout-next').innerHTML=`Zpět na nabídku ${icon('arrow')}`;$('#checkout-foot-total').textContent=money(snapshot.prices.total);}
        else renderSummary();
        closeResults(); dialog.scrollTo({top:0,behavior:'instant'});
        dialog.querySelector(`[data-panel="${next}"] h2`).focus({preventScroll:true});
      }
      function validate(){
        $('#checkout-error').hidden=true;
        const name=form.elements.customerName, phone=form.elements.phone;
        if(name.value.trim().length<2){showError('Doplňte prosím své jméno.',name);return false;}
        if(!/^\+?[\d\s()-]{9,20}$/.test(phone.value.trim())||phone.value.replace(/\D/g,'').length<9){showError('Zadejte prosím platné telefonní číslo.',phone);return false;}
        const inputs=[...dialog.querySelectorAll('[data-panel="1"] input')].filter(input=>input.required);
        for(const input of inputs){if(!input.checkValidity()){showError(input.type==='email'?'Zadejte prosím platný e-mail.':'Doplňte prosím všechna povinná pole.',input);return false;}}
        if(delivery()&&(!/\d/.test(address.value)||address.value.trim().length<6)){showError('Doplňte celou doručovací adresu včetně čísla domu.',address);return false;}
        if(value('timing')==='scheduled'&&new Date(value('scheduledTime')).getTime()<Date.now()){showError('Vyberte prosím čas v budoucnosti.',$('#scheduled-time'));return false;}
        return true;
      }
      function finish(){
        if(busy||completed||!cart.count)return;
        busy=true; const button=$('#checkout-next');button.disabled=true;button.innerHTML='<span class="checkout-spinner"></span> '+(value('payment')==='card'?'Simuluji platbu…':'Odesílám demo objednávku…');
        dialog.setAttribute('aria-busy','true');form.inert=true;$('#checkout-close').disabled=true;$('#checkout-back').disabled=true;
        snapshot={prices:prices(),payment:value('payment'),delivery:delivery(),contact:contactText()};
        // Deliberate demo delay only; no network, payment SDK, form submission or persistence.
        setTimeout(()=>{
          completed=true;busy=false;form.inert=false;dialog.removeAttribute('aria-busy');button.disabled=false;$('#checkout-close').disabled=false;$('#checkout-back').disabled=false;
          $('#demo-order-number').textContent='DEMO-'+new Date().toISOString().slice(5,10).replace('-','')+'-'+String(Math.floor(Math.random()*9000)+1000);
          $('#success-payment').innerHTML=icon('check')+`<span>${snapshot.payment==='card'?'Platba kartou simulována':'Hotově při převzetí'}<strong>${money(snapshot.prices.total)}</strong></span>`;
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
      dialog.addEventListener('close',()=>{closeResults();if(completed){form.reset();$('#selected-address').hidden=true;$('#address-clear').hidden=true;}});
      $('#start-checkout').addEventListener('click',()=>{
        if(!cart.count)return;
        $('#cart-dialog').close();completed=false;snapshot=null;
        const minDate=new Date(Date.now()+30*60000);minDate.setMinutes(minDate.getMinutes()-minDate.getTimezoneOffset());
        $('#scheduled-time').min=minDate.toISOString().slice(0,16);
        $('#checkout-error').hidden=true;dialog.showModal();syncOptions();setStep(1);
      });
    }
  };
})(window);
