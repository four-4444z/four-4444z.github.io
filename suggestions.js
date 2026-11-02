const suggestionForm = document.getElementById('suggestion-form');

async function waitForSuggestionsService(apiUrl, feedback) {
  const deadline = Date.now() + 90000;
  let lastError = 'The service did not respond.';

  while (Date.now() < deadline) {
    const remaining = deadline - Date.now();
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      Math.min(12000, remaining)
    );

    try {
      const response = await fetch(`${apiUrl}/health`, {
        cache: 'no-store',
        signal: controller.signal
      });
      if (response.ok) return;
      lastError = `The service returned HTTP ${response.status}.`;
      if (response.status < 500) throw new Error(lastError);
    } catch (error) {
      if (error instanceof Error && !['AbortError', 'TypeError'].includes(error.name)) {
        throw error;
      }
      lastError = error.name === 'AbortError'
        ? 'The service health check timed out.'
        : 'The service is waking up or temporarily unreachable.';
    } finally {
      window.clearTimeout(timeout);
    }

    feedback.textContent = 'Waking the suggestions service...';
    const delay = Math.min(2500, deadline - Date.now());
    if (delay > 0) await new Promise((resolve) => window.setTimeout(resolve, delay));
  }

  throw new Error(`Could not reach the suggestions service after 90 seconds. ${lastError}`);
}

suggestionForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitButton = suggestionForm.querySelector('button[type="submit"]');
  const feedback = document.getElementById('suggestion-feedback');
  const formData = new FormData(suggestionForm);
  submitButton.disabled = true;
  feedback.textContent = 'Sending your suggestion...';

  try {
    const configuredApiUrl = (window.SYSTEM_CORE_API_URL || '').replace(/\/+$/, '');
    const isLocalSite = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
    const apiUrl = configuredApiUrl || (isLocalSite ? window.location.origin : '');
    if (!apiUrl) throw new Error('The suggestions service is not configured for this site.');
    await waitForSuggestionsService(apiUrl, feedback);
    feedback.textContent = 'Sending your suggestion...';
    const response = await fetch(`${apiUrl}/api/suggestions`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({
        type: formData.get('type'),
        title: formData.get('title'),
        details: formData.get('details'),
        name: formData.get('name')
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not send your suggestion.');
    suggestionForm.reset();
    feedback.textContent = 'Thanks! Your suggestion was sent.';
  } catch (error) {
    feedback.textContent = error.message || 'Could not send your suggestion. Please try again.';
  } finally {
    submitButton.disabled = false;
  }
});
