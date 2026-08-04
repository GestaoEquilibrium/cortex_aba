// ============================================================================
// CORTEX aba — CPF
// ----------------------------------------------------------------------------
// Máscara enquanto digita e conferência do dígito verificador.
//
// O banco também valida — esta camada existe só para a pessoa descobrir na hora,
// e não depois de preencher o formulário inteiro e apertar salvar.
// ============================================================================

window.EqCPF = (function () {
    'use strict';

    function digitos(v) { return String(v || '').replace(/\D/g, '').slice(0, 11); }

    function formatar(v) {
        const d = digitos(v);
        if (d.length <= 3)  return d;
        if (d.length <= 6)  return d.slice(0,3) + '.' + d.slice(3);
        if (d.length <= 9)  return d.slice(0,3) + '.' + d.slice(3,6) + '.' + d.slice(6);
        return d.slice(0,3) + '.' + d.slice(3,6) + '.' + d.slice(6,9) + '-' + d.slice(9);
    }

    // Mesmo cálculo do banco. Repetir a regra nos dois lados é aceitável aqui:
    // o banco é a garantia, a tela é a cortesia.
    function valido(v) {
        const d = digitos(v);
        if (!d) return true;                    // vazio é permitido
        if (d.length !== 11) return false;
        if (/^(\d)\1{10}$/.test(d)) return false;  // 111.111.111-11 e afins

        let soma = 0;
        for (let i = 0; i < 9; i++) soma += parseInt(d[i], 10) * (10 - i);
        let dig = 11 - (soma % 11);
        if (dig >= 10) dig = 0;
        if (dig !== parseInt(d[9], 10)) return false;

        soma = 0;
        for (let i = 0; i < 10; i++) soma += parseInt(d[i], 10) * (11 - i);
        dig = 11 - (soma % 11);
        if (dig >= 10) dig = 0;
        return dig === parseInt(d[10], 10);
    }

    // Liga um campo: formata ao digitar e marca em vermelho quando estiver errado
    function ligar(id) {
        const el = document.getElementById(id);
        if (!el || el.dataset.cpfLigado) return;
        el.dataset.cpfLigado = '1';
        el.setAttribute('inputmode', 'numeric');
        el.setAttribute('maxlength', '14');
        el.setAttribute('placeholder', '000.000.000-00');

        el.addEventListener('input', function () {
            const pos = this.selectionStart;
            const antes = this.value.length;
            this.value = formatar(this.value);
            // mantém o cursor onde estava, compensando os pontos inseridos
            const dif = this.value.length - antes;
            if (pos !== null) this.setSelectionRange(pos + dif, pos + dif);
            // enquanto digita, só reclama quando o número já está completo:
            // marcar em vermelho no terceiro dígito é ruído, não ajuda
            marcar(this, digitos(this.value).length === 11);
        });
        el.addEventListener('blur', function () { marcar(this, true); });
    }

    function marcar(el, cobrar) {
        const d = digitos(el.value);
        const ok = (!cobrar && d.length < 11) || valido(el.value);
        el.style.borderColor = ok ? '' : 'var(--st-bad)';
        const aviso = document.getElementById(el.id + '_aviso');
        if (aviso) {
            aviso.textContent = ok ? '' : 'Confira o número — não é um CPF válido.';
            aviso.style.display = ok ? 'none' : 'block';
        }
    }

    // devolve só os dígitos, para gravar
    function paraSalvar(id) {
        const el = document.getElementById(id);
        return el && digitos(el.value) ? digitos(el.value) : null;
    }

    function conferirCampos(ids) {
        for (const id of ids) {
            const el = document.getElementById(id);
            if (el && !valido(el.value)) return id;
        }
        return null;
    }

    return { formatar, valido, ligar, paraSalvar, digitos, conferirCampos };
})();
