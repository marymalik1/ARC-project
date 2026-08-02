import { Pencil, Trash2 } from 'lucide-react'
import { formatCount, totalPages } from '../lib/dealers'
import { buildPageItems } from '../lib/pagination'

export default function DealersTable({
  dealers,
  total = dealers.length,
  page = 1,
  pageSize = dealers.length || 1,
  onPageChange = () => {},
  onEdit,
  onDelete,
}) {
  const lastPage = totalPages(total, pageSize)
  const firstEntry = total === 0 ? 0 : (page - 1) * pageSize + 1
  const lastEntry = Math.min(page * pageSize, total)

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
                <td data-label="Dealer Code">{dealer.code}</td>
                <td data-label="Dealer Name">{dealer.name}</td>
                <td data-label="Region">{dealer.region}</td>
                <td data-label="Zone">{dealer.zone}</td>
                <td data-label="Territory">{dealer.territory}</td>
                <td data-label="Status">
                  <div className="status-cell">
                    <span className={`status status--${dealer.status.toLowerCase()}`}>
                      <span />
                      {dealer.status}
                    </span>
                    {/* Self-registrations arrive unverified and need a review. */}
                    {!dealer.verified && <span className="status-pending">Unverified</span>}
                  </div>
                </td>
                <td data-label="Created On">{dealer.createdOn}</td>
                <td data-label="Actions">
                  <div className="row-actions">
                    {onEdit && (
                      <button type="button" onClick={() => onEdit(dealer)} aria-label={`Edit ${dealer.name}`}>
                        <Pencil />
                      </button>
                    )}
                    {onDelete && (
                      <button className="delete-action" type="button" onClick={() => onDelete(dealer.code)} aria-label={`Delete ${dealer.name}`}>
                        <Trash2 />
                      </button>
                    )}
                    {!onEdit && !onDelete && <span className="row-actions-empty">—</span>}
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
        <p aria-live="polite">
          Showing {formatCount(firstEntry)} to {formatCount(lastEntry)} of {formatCount(total)} entries
        </p>
        <nav className="pagination" aria-label="Table pagination">
          <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            Previous
          </button>
          {buildPageItems(page, lastPage).map((item) => item.ellipsis ? (
            <span key={item.key}>...</span>
          ) : (
            <button
              key={item.key}
              className={item.page === page ? 'page-active' : undefined}
              type="button"
              aria-current={item.page === page ? 'page' : undefined}
              onClick={() => onPageChange(item.page)}
            >
              {item.page}
            </button>
          ))}
          <button type="button" disabled={page >= lastPage} onClick={() => onPageChange(page + 1)}>
            Next
          </button>
        </nav>
      </div>
    </section>
  )
}
