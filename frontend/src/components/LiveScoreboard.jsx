export default function LiveScoreboard({ champion, summary }) {
  return (
    <section className="card">
      <h3>Live Scoreboard</h3>
      <p>
        House Champion: <strong>{champion?.house_name || "Pending"}</strong>
      </p>
      <p>Champion Points: <strong>{champion?.total_points || 0}</strong></p>
      <h4>Event Result Summary</h4>
      <ul>
        {summary.map((row) => (
          <li key={row.event_id}>
            {row.event_name}: {row.total_results} result rows
          </li>
        ))}
      </ul>
    </section>
  );
}
