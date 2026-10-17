export function setupPublicForm(formId: string, buttonId: string, statusId: string, pending: string, success: string, idle: string) {
  const form = document.getElementById(formId) as HTMLFormElement | null;
  const button = document.getElementById(buttonId) as HTMLButtonElement | null;
  const status = document.getElementById(statusId);
  if (!form || !button || !status) return;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (button.disabled) return;
    button.disabled = true;
    button.textContent = pending;
    form.setAttribute('aria-busy', 'true');
    status.hidden = true;
    try {
      const localPreview = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
      if (localPreview) {
        status.textContent = 'Local preview: the form is valid. Nothing was sent.';
      } else {
        const response = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error();
        form.reset();
        status.textContent = success;
      }
      status.className = 'form-status success';
    } catch {
      status.textContent = 'Something went wrong. Please try again.';
      status.className = 'form-status error';
    } finally {
      status.hidden = false;
      status.focus();
      form.removeAttribute('aria-busy');
      button.disabled = false;
      button.textContent = idle;
    }
  });
}
