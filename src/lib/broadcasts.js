/** Derives the broadcast button from data that must be confirmed server-side. */
export function broadcastSubmitState({ hasFile, sending, recipients, storage }) {
  const audienceReady = Number.isInteger(recipients) && recipients > 0

  return {
    disabled: !hasFile || sending || !audienceReady || !storage,
    label: sending ? 'Sending…' : audienceReady ? `Send to ${recipients}` : 'Send',
  }
}
