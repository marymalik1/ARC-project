import { Download, ListFilter, Plus, Search } from 'lucide-react'
import {
  ANY_REGION,
  ANY_TERRITORY,
  ANY_ZONE,
  emptyFacets,
  statusOptions,
  verificationOptions,
} from '../lib/dealers'

export default function Filters({
  values,
  facets = emptyFacets,
  onChange,
  onSearch,
  onClear,
  onExport,
  onCreate,
}) {
  const update = (field) => (event) => onChange(field, event.target.value)

  // Dropdowns list the regions, zones and territories that exist in the database.
  const regionOptions = [ANY_REGION, ...facets.regions]
  const zoneOptions = [ANY_ZONE, ...facets.zones]
  const territoryOptions = [ANY_TERRITORY, ...facets.territories]

  return (
    <form
      className="filter-panel"
      onSubmit={(event) => {
        event.preventDefault()
        onSearch()
      }}
    >
      <div className="field">
        <label htmlFor="dealer-code">Dealer Code</label>
        <input
          id="dealer-code"
          value={values.code}
          onChange={update('code')}
          placeholder="Enter dealer code"
        />
      </div>
      <div className="field">
        <label htmlFor="dealer-name">Dealer Name</label>
        <input
          id="dealer-name"
          value={values.name}
          onChange={update('name')}
          placeholder="Enter dealer name"
        />
      </div>
      <div className="field">
        <label htmlFor="region">Region</label>
        <select id="region" value={values.region} onChange={update('region')}>
          {regionOptions.map((option) => <option key={option}>{option}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="zone">Zone</label>
        <select id="zone" value={values.zone} onChange={update('zone')}>
          {zoneOptions.map((option) => <option key={option}>{option}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="territory">Territory</label>
        <select id="territory" value={values.territory} onChange={update('territory')}>
          {territoryOptions.map((option) => <option key={option}>{option}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="status">Status</label>
        <select id="status" value={values.status} onChange={update('status')}>
          {statusOptions.map((option) => <option key={option}>{option}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="verification">Verification</label>
        <select id="verification" value={values.verification} onChange={update('verification')}>
          {verificationOptions.map((option) => <option key={option}>{option}</option>)}
        </select>
      </div>
      <div className="search-field">
        <Search aria-hidden="true" />
        <input
          aria-label="Search by code or name"
          value={values.query}
          onChange={update('query')}
          placeholder="Search by code or name..."
        />
      </div>
      <div className="filter-actions">
        <button className="button button--primary search-button" type="submit">
          <Search aria-hidden="true" />
          <span>Search</span>
        </button>
        <button className="button button--clear" type="button" onClick={onClear}>
          <ListFilter aria-hidden="true" />
          <span>Clear Filters</span>
        </button>
        {/* Omitted entirely for roles without the capability, rather than
            rendered and then rejected by the API. */}
        {onExport && (
          <button className="button button--secondary" type="button" onClick={onExport}>
            <Download aria-hidden="true" />
            <span>Export</span>
          </button>
        )}
        {onCreate && (
          <button className="button button--primary create-button" type="button" onClick={onCreate}>
            <Plus aria-hidden="true" />
            <span>Create Account</span>
          </button>
        )}
      </div>
    </form>
  )
}
