export default function ProgressBar({
  value = 0,
  color = 'linear-gradient(90deg,#FF6B2C,#E8762C)',
  height = 5,
}) {
  return (
    <div style={{
      width: '100%', height, borderRadius: height / 2,
      background: 'rgba(255,255,255,0.07)', overflow: 'hidden',
    }}>
      <div style={{
        width: `${Math.min(100, Math.max(0, value))}%`,
        height: '100%', borderRadius: height / 2,
        background: color, transition: 'width 0.6s ease',
      }} />
    </div>
  )
}
