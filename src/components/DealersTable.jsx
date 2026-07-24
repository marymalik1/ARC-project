import { Pencil, Trash2 } from 'lucide-react'

export default function DealersTable({ dealers, onEdit, onDelete }) {
  return (
    <section className="table-card" aria-label="Dealer accounts">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Dealer Code</th>
              <th>Dealer Name</th>
              <th>Region</th>
              <th>Zone</th>
              <th>Territory</th>
              <th>Status</th>
              <th>Created On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {dealers.length > 0 ? dealers.map((dealer) => (
              <tr key={dealer.code}>
                <td>{dealer.code}</td>
                <td>{dealer.name}</td>
                <td>{dealer.region}</td>
                <td>{dealer.zone}</td>
                <td>{dealer.territory}</td>
                <td>
                  <span className={`status status--${dealer.status.toLowerCase()}`}>
                    <span />
                    {dealer.status}
                  </span>
                </td>
                <td>{dealer.createdOn}</td>
                <td>
                  <div className="row-actions">
                    <button type="button" onClick={() => onEdit(dealer)} aria-label={`Edit ${dealer.name}`}>
                      <Pencil />
                    </button>
                    <button className="delete-action" type="button" onClick={() => onDelete(dealer.code)} aria-label={`Delete ${dealer.name}`}>
                      <Trash2 />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td className="empty-row" colSpan="8">No dealer accounts match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        <p>Showing 1 to {dealers.length} of 1,250 entries</p>
        <nav className="pagination" aria-label="Table pagination">
          <button type="button" disabled>Previous</button>
          <button className="page-active" type="button" aria-current="page">1</button>
          <button type="button">2</button>
          <button type="button">3</button>
          <span>...</span>
          <button type="button">250</button>
          <button type="button">Next</button>
        </nav>
      </div>
    </section>
  )
}
