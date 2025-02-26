<tbody>
  {data.map((item, index) => (
    <tr 
      key={item.id + '-' + index}
    >
      // ... existing td content ...
    </tr>
  ))}
</tbody> 