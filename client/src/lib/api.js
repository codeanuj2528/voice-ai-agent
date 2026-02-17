const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Generic API helper for making requests to the backend.
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Don't set Content-Type for FormData (file uploads)
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// Token
export async function getToken(roomName = 'voice-agent-room', participantName = 'user') {
  return apiFetch('/token', {
    method: 'POST',
    body: JSON.stringify({ room_name: roomName, participant_name: participantName }),
  });
}

// Prompt
export async function getPrompt() {
  return apiFetch('/prompt');
}

export async function updatePrompt(systemPrompt) {
  return apiFetch('/prompt', {
    method: 'PUT',
    body: JSON.stringify({ system_prompt: systemPrompt }),
  });
}

// Documents
export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch('/documents/upload', {
    method: 'POST',
    body: formData,
  });
}

export async function getDocuments() {
  return apiFetch('/documents');
}

export async function deleteDocument(docId) {
  return apiFetch(`/documents/${docId}`, {
    method: 'DELETE',
  });
}
