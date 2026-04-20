export default function Toggle({ on, onToggle, color = '#6366f1' }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: 48, height: 26, borderRadius: 13, cursor: 'pointer',
        background: on ? color : 'rgba(255,255,255,0.1)',
        position: 'relative', transition: 'background 0.3s', flexShrink: 0,
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: 10, background: 'white',
        position: 'absolute', top: 3, left: on ? 25 : 3,
        transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      }} />
    </div>
  )
}
