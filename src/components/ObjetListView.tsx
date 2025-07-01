import React from "react";

interface ObjectListViewProps {
  data: any;
  level?: number;
}

const ObjectListView: React.FC<ObjectListViewProps> = ({ data, level = 0 }) => {
  if (data === null || data === undefined) return <span>Non renseigné</span>;
  if (typeof data !== "object") return <span>{String(data)}</span>;
  if (Array.isArray(data)) {
    return (
      <ul style={{ marginLeft: (level + 1) * 16 }}>
        {data.map((item, idx) => (
          <li key={idx}><ObjectListView data={item} level={level + 1} /></li>
        ))}
      </ul>
    );
  }
  return (
    <ul style={{ marginLeft: (level + 1) * 16 }}>
      {Object.entries(data).map(([k, v]) => (
        <li key={k}>
          <strong>{k}:</strong> <ObjectListView data={v} level={level + 1} />
        </li>
      ))}
    </ul>
  );
};

export default ObjectListView;