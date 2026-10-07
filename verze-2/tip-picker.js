(function(root) {
  'use strict';
  root.PiPizzaTipPicker = {
    create({money, onApply}) {
      const $ = selector => document.querySelector(selector);
      const dialog = $('#tip-dialog'), dial = $('#tip-dial'), input = $('#tip-amount');
      const max = Number(input.max), circumference = 2 * Math.PI * 98;
      let draft = 0, subtotal = 0, dragging = false;
      function render(updateInput = true) {
        if(updateInput)input.value=String(draft);
        const fraction=draft/max, angle=(135+fraction*270)*Math.PI/180;
        $('#tip-dial-progress').style.strokeDasharray=`${circumference*.75*fraction} ${circumference}`;
        $('#tip-dial-thumb').setAttribute('cx',String(120+98*Math.cos(angle)));
        $('#tip-dial-thumb').setAttribute('cy',String(120+98*Math.sin(angle)));
        dial.setAttribute('aria-valuenow',String(draft));
        dial.setAttribute('aria-valuetext',money(draft));
        $('#tip-dial-value').textContent=money(draft);
        $('#tip-modal-total strong').textContent=money(root.PiPizzaCheckoutModel.totals(subtotal,'card',draft).total);
        $('#tip-apply').innerHTML=draft?`Přidat dýško <span>${money(draft)}</span>`:'Pokračovat bez dýška';
        $('#tip-apply').disabled=false;
        dialog.querySelectorAll('[data-tip-amount]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.tipAmount)===draft)));
      }
      function setAmount(amount) {
        draft=Math.max(0,Math.min(max,Math.round(amount)));
        render();
      }
      function pointAmount(event) {
        const rect=dial.getBoundingClientRect();
        const x=event.clientX-rect.left-rect.width/2, y=event.clientY-rect.top-rect.height/2;
        // Leave the central amount readable and draggable only via the ring.
        if(!dragging && Math.hypot(x,y)<rect.width*.28)return;
        const degrees=(Math.atan2(y,x)*180/Math.PI-135+360)%360;
        const sweep=degrees<=270?degrees:degrees<315?270:0;
        setAmount(sweep/270*max);
      }
      dial.addEventListener('pointerdown',event=>{
        if(event.button!==0)return;
        pointAmount(event);dragging=true;dial.setPointerCapture(event.pointerId);dial.focus();
      });
      dial.addEventListener('pointermove',event=>{if(dragging)pointAmount(event);});
      dial.addEventListener('pointerup',()=>{dragging=false;});
      dial.addEventListener('pointercancel',()=>{dragging=false;});
      dial.addEventListener('lostpointercapture',()=>{dragging=false;});
      dial.addEventListener('keydown',event=>{
        const changes={ArrowUp:1,ArrowRight:1,ArrowDown:-1,ArrowLeft:-1,PageUp:10,PageDown:-10};
        if(Object.hasOwn(changes,event.key)){event.preventDefault();setAmount(draft+changes[event.key]);}
        else if(event.key==='Home'||event.key==='End'){event.preventDefault();setAmount(event.key==='Home'?0:max);}
      });
      input.addEventListener('input',()=>{
        if(input.value!=='' && input.validity.valid){draft=Number(input.value);render(false);}
        else $('#tip-apply').disabled=true;
      });
      dialog.querySelectorAll('[data-tip-amount]').forEach(button=>button.addEventListener('click',()=>setAmount(Number(button.dataset.tipAmount))));
      $('#tip-amount-form').addEventListener('submit',event=>{
        event.preventDefault();
        if(!input.reportValidity())return;
        onApply(draft);dialog.close();
      });
      dialog.addEventListener('close',()=>{dragging=false;$('#tip-custom-open').focus({preventScroll:true});});
      return {open(amount, total) {subtotal=total;setAmount(amount);dialog.showModal();dial.focus({preventScroll:true});}};
    }
  };
})(window);
