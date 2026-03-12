export default function LeaderboardTable({ rows }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Rank</th>
          <th>House</th>
          <th>Total Points</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{row.rank}</td>
            <td>{row.house_name}</td>
            <td>{row.total_points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
