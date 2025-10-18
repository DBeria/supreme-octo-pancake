import React, { useEffect, useState } from "react";
import axios from "axios";

/**
 * Drop this on your Dashboard page, e.g. <DashboardCertificates />
 * It tries GET /api/certificates (current user), then falls back to localStorage.
 * Expected server shape (example):
 * [
 *   { id, courseId, courseTitle, issuedAt, idNumber, imageBase64 }
 * ]
 */
export default function DashboardCertificates() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const { data } = await axios.get("/api/certificates", { headers });
        if (Array.isArray(data) && data.length) {
          setItems(data);
        } else {
          // fallback to localStorage
          const uid = (await getUserId(headers)) || "me";
          const local = JSON.parse(localStorage.getItem(`certificates:${uid}`) || "[]");
          setItems(local);
        }
      } catch {
        const uid = (await getUserId()) || "me";
        const local = JSON.parse(localStorage.getItem(`certificates:${uid}`) || "[]");
        setItems(local);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-6">Loading certificates…</div>;

  if (!items.length)
    return (
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <h3 className="text-xl font-bold mb-2">Certificates</h3>
        <p className="text-slate-500">No certificates yet.</p>
      </div>
    );

  return (
    <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <h3 className="text-xl font-bold mb-4">Certificates</h3>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => (
          <div key={c.id} className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow">
            <div className="p-4">
              <div className="font-semibold">{c.courseTitle || "Course"}</div>
              <div className="text-sm text-slate-500">Issued: {new Date(c.issuedAt).toLocaleDateString()}</div>
              <div className="text-sm text-slate-600 mt-1">ID: {c.idNumber || "—"}</div>
            </div>
            {c.imageBase64 && (
              <img src={c.imageBase64} alt="Certificate" className="w-full object-cover" />
            )}
            <div className="p-4 flex justify-end">
              {c.imageBase64 && (
                <a
                  href={c.imageBase64}
                  download={`certificate-${(c.courseTitle || "course").replace(/\s+/g, "-")}.png`}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
                >
                  Download
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function getUserId(headers) {
  try {
    const { data } = await axios.get("/api/users/profile", headers ? { headers } : undefined);
    return data?._id;
  } catch {
    return null;
  }
}
