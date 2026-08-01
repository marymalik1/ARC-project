import { X } from 'lucide-react'
import { emptyFacets } from '../lib/dealers'

export default function AccountModal({ dealer, facets = emptyFacets, onClose, onSave }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2 id="modal-title">{dealer ? 'Edit Account' : 'Create Account'}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog"><X /></button>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            onSave({
              code: dealer?.code || form.get('code'),
              name: form.get('name'),
              region: form.get('region'),
              zone: form.get('zone'),
              territory: form.get('territory'),
              status: form.get('status'),
            })
          }}
        >
          <label>
            Dealer Code
            <input name="code" defaultValue={dealer?.code} disabled={Boolean(dealer)} required />
          </label>
          <label>
            Dealer Name
            <input name="name" defaultValue={dealer?.name} required />
          </label>
          <label>
            Region
            <input name="region" list="region-options" defaultValue={dealer?.region} required />
          </label>
          <label>
            Zone
            <input name="zone" list="zone-options" defaultValue={dealer?.zone} required />
          </label>
          <label>
            Territory
            <input name="territory" list="territory-options" defaultValue={dealer?.territory} required />
          </label>
          <label>
            Status
            <select name="status" defaultValue={dealer?.status || 'Active'}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </label>
          <datalist id="region-options">
            {facets.regions.map((option) => <option key={option} value={option} />)}
          </datalist>
          <datalist id="zone-options">
            {facets.zones.map((option) => <option key={option} value={option} />)}
          </datalist>
          <datalist id="territory-options">
            {facets.territories.map((option) => <option key={option} value={option} />)}
          </datalist>
          <div className="modal-actions">
            <button className="button button--secondary" type="button" onClick={onClose}>Cancel</button>
            <button className="button button--primary" type="submit">Save Account</button>
          </div>
        </form>
      </section>
    </div>
  )
}
