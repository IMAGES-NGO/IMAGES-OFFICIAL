  "use client";

import { jsPDF } from "jspdf";
import { Award, Download, FileText } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface PointTransaction {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
}

interface UserPointsData {
  points: number;
  history: PointTransaction[];
}

async function loadLogoDataUrl() {
  const response = await fetch("/assets/images/logo.jpg");
  if (!response.ok) {
    throw new Error(`Logo request failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const image = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Logo could not be prepared for the certificate");
  }

  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const certificateBackground = [248, 250, 252];
  for (let index = 0; index < imageData.data.length; index += 4) {
    const darkness = 1 - Math.min(
      imageData.data[index],
      imageData.data[index + 1],
      imageData.data[index + 2],
    ) / 255;
    imageData.data[index] = Math.round(certificateBackground[0] * (1 - darkness));
    imageData.data[index + 1] = Math.round(certificateBackground[1] * (1 - darkness));
    imageData.data[index + 2] = Math.round(certificateBackground[2] * (1 - darkness));
    imageData.data[index + 3] = 255;
  }
  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<UserPointsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin"); 
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      async function fetchPoints() {
        try {
          const res = await fetch("/api/user/points");
          if (res.ok) {
            const json = await res.json();
            setData(json);
          } else {
            setError("We could not load your contribution history. Please try again.");
          }
        } catch {
          setError("We could not load your contribution history. Please try again.");
        } finally {
          setLoading(false);
        }
      }
      fetchPoints();
    }
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const memberName = session.user?.name || session.user?.email || "Member";
  const safeFilename = memberName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "member";

  const downloadContributionRecord = () => {
    if (!data) return;

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const positiveContributions = data.history.filter((transaction) => transaction.amount > 0);
    let y = 24;

    pdf.setTextColor(14, 116, 144);
    pdf.setFontSize(24);
    pdf.text("IMAGES", 20, y);
    pdf.setTextColor(24, 24, 27);
    pdf.setFontSize(18);
    pdf.text("Contribution Record", 20, y + 14);
    pdf.setFontSize(10);
    pdf.setTextColor(82, 82, 91);
    pdf.text(`Member: ${memberName}`, 20, y + 25);
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 20, y + 32);

    y += 48;
    pdf.setFillColor(240, 249, 255);
    pdf.roundedRect(20, y - 7, pageWidth - 40, 28, 3, 3, "F");
    pdf.setTextColor(14, 116, 144);
    pdf.setFontSize(12);
    pdf.text(`Current points balance: ${data.points.toLocaleString()}`, 28, y + 5);
    pdf.text(`Recorded contributions: ${positiveContributions.length}`, 28, y + 14);
    y += 36;

    pdf.setTextColor(24, 24, 27);
    pdf.setFontSize(11);
    pdf.text("Date", 20, y);
    pdf.text("Contribution", 62, y);
    pdf.text("Points", pageWidth - 38, y, { align: "right" });
    y += 7;
    pdf.setDrawColor(212, 212, 216);
    pdf.line(20, y, pageWidth - 20, y);
    y += 8;
    pdf.setFontSize(10);

    data.history.forEach((transaction) => {
      if (y > 275) {
        pdf.addPage();
        y = 20;
      }
      pdf.setTextColor(82, 82, 91);
      pdf.text(new Date(transaction.createdAt).toLocaleDateString(), 20, y);
      pdf.setTextColor(24, 24, 27);
      const reason = pdf.splitTextToSize(transaction.reason, pageWidth - 105);
      pdf.text(reason, 62, y);
      pdf.setTextColor(transaction.amount >= 0 ? 5 : 225, transaction.amount >= 0 ? 150 : 29, transaction.amount >= 0 ? 105 : 72);
      pdf.text(`${transaction.amount >= 0 ? "+" : ""}${transaction.amount.toLocaleString()}`, pageWidth - 38, y, { align: "right" });
      y += Math.max(9, reason.length * 5);
    });

    pdf.setTextColor(113, 113, 122);
    pdf.setFontSize(8);
    pdf.text("This record is generated from the contribution history recorded by IMAGES.", 20, 287);
    pdf.save(`${safeFilename}-contribution-record.pdf`);
  };

  const downloadCertificate = async () => {
    if (!data) return;

    try {
      const logoDataUrl = await loadLogoDataUrl();
      const pdf = new jsPDF({ orientation: "landscape" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.setFillColor(248, 250, 252);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");
      pdf.setDrawColor(14, 165, 233);
      pdf.setLineWidth(1.5);
      pdf.rect(12, 12, pageWidth - 24, pageHeight - 24);
      pdf.setDrawColor(186, 230, 253);
      pdf.setLineWidth(0.5);
      pdf.rect(17, 17, pageWidth - 34, pageHeight - 34);
      pdf.addImage(logoDataUrl, "PNG", pageWidth / 2 - 16, 21, 32, 32);
      pdf.setTextColor(24, 24, 27);
      pdf.setFontSize(25);
      pdf.text("Certificate of Contribution", pageWidth / 2, 65, { align: "center" });
      pdf.setTextColor(82, 82, 91);
      pdf.setFontSize(13);
      pdf.text("This certificate is proudly presented to", pageWidth / 2, 86, { align: "center" });
      pdf.setTextColor(14, 116, 144);
      pdf.setFontSize(30);
      pdf.text(memberName, pageWidth / 2, 110, { align: "center" });
      pdf.setTextColor(82, 82, 91);
      pdf.setFontSize(12);
      pdf.text("in recognition of their valuable contributions to the IMAGES community.", pageWidth / 2, 130, { align: "center" });
      pdf.setTextColor(24, 24, 27);
      pdf.setFontSize(14);
      pdf.text(`${data.points.toLocaleString()} points earned`, pageWidth / 2, 151, { align: "center" });
      pdf.setTextColor(113, 113, 122);
      pdf.setFontSize(10);
      pdf.text(`Issued on ${new Date().toLocaleDateString()}`, pageWidth / 2, 176, { align: "center" });
      pdf.text("IMAGES Team", pageWidth / 2, 192, { align: "center" });
      pdf.save(`${safeFilename}-contribution-certificate.pdf`);
    } catch {
      setError("We could not add the IMAGES logo to your certificate. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 py-16 px-4 sm:px-6 lg:px-8 font-sans selection:bg-sky-500/30">
      <div className="max-w-4xl mx-auto space-y-16">
        
        {/* Header section */}
        <div className="text-center space-y-4 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-sky-200/50 blur-[100px] rounded-full pointer-events-none"></div>
          <h1 className="font-primary-italic text-4xl sm:text-5xl lg:text-6xl text-zinc-900 mt-1">
            Welcome back, {memberName}
          </h1>
          <p className="text-zinc-500 text-lg max-w-2xl mx-auto font-medium">
            Manage your profile, check your points balance, and review your recent activity.
          </p>
        </div>

        {/* Balance Card */}
        <div className="relative group max-w-sm mx-auto text-center">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-200 to-sky-100 rounded-[2rem] blur opacity-50"></div>
            <div className="relative bg-white rounded-3xl border border-zinc-200 shadow-xl p-8">
                <div className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-2">Total Balance</div>
                <div className="text-6xl sm:text-7xl font-black text-sky-600 tracking-tight drop-shadow-sm">
                    {data?.points.toLocaleString()}
                </div>
            </div>
        </div>

        {error && (
          <div role="alert" className="max-w-3xl mx-auto rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-center text-rose-700">
            {error}
          </div>
        )}

        {/* Contribution documents */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-lg">
            <FileText className="mb-4 h-8 w-8 text-sky-600" aria-hidden="true" />
            <h2 className="text-xl font-bold text-zinc-900">Contribution record</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">Download a complete PDF record of your points and contribution history.</p>
            <button
              type="button"
              onClick={downloadContributionRecord}
              disabled={!data || Boolean(error)}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download record
            </button>
          </div>
          <div className="rounded-3xl border border-amber-100 bg-white p-6 shadow-lg">
            <Award className="mb-4 h-8 w-8 text-amber-500" aria-hidden="true" />
            <h2 className="text-xl font-bold text-zinc-900">Certificate of contribution</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">Generate a personalized certificate you can keep as proof of your work.</p>
            <button
              type="button"
              onClick={downloadCertificate}
              disabled={!data || Boolean(error)}
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-500 px-5 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download certificate
            </button>
          </div>
        </div>

        {/* Transaction History */}
        <div className="relative group max-w-3xl mx-auto">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-200 to-sky-100 rounded-[2rem] blur opacity-50 transition duration-1000"></div>
          <div className="relative bg-white rounded-3xl border border-zinc-200 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-zinc-200 bg-zinc-50/50">
               <h2 className="text-xl sm:text-2xl font-bold text-zinc-800 flex items-center gap-2">
                 <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                 Transaction History
               </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 border-b border-zinc-200 text-xs sm:text-sm uppercase tracking-widest font-bold">
                    <th className="py-5 px-6 sm:px-8 w-48 text-left">Date</th>
                    <th className="py-5 px-6 sm:px-8">Description</th>
                    <th className="py-5 px-6 sm:px-8 text-right w-32">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                    {data?.history.length === 0 ? (
                    <tr>
                        <td colSpan={3} className="py-12 text-center text-zinc-500 bg-zinc-50">
                            <p className="text-lg">No transactions yet.</p>
                        </td>
                    </tr>
                    ) : (
                        data?.history.map((tx) => {
                        const isPositive = tx.amount > 0;
                        return (
                            <tr 
                            key={tx.id} 
                            className="hover:bg-zinc-50 transition-colors group"
                            >
                            <td className="py-4 px-6 sm:px-8 text-sm text-zinc-500 whitespace-nowrap">
                                {new Date(tx.createdAt).toLocaleDateString(undefined, {
                                    year: 'numeric', month: 'short', day: 'numeric',
                                })}
                                <span className="text-zinc-400 ml-2 text-xs">
                                    {new Date(tx.createdAt).toLocaleTimeString(undefined, {
                                        hour: '2-digit', minute: '2-digit'
                                    })}
                                </span>
                            </td>
                            <td className="py-4 px-6 sm:px-8 font-medium text-zinc-800">
                                {tx.reason}
                            </td>
                            <td className={`py-4 px-6 sm:px-8 text-right font-bold whitespace-nowrap flex items-center justify-end gap-1.5
                                ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                
                                <span className={`flex items-center justify-center w-6 h-6 rounded-full ${isPositive ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                                    <svg className={`w-3.5 h-3.5 ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        {isPositive 
                                            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                        }
                                    </svg>
                                </span>
                                {isPositive ? '+' : ''}{tx.amount.toLocaleString()}
                            </td>
                            </tr>
                        );
                        })
                    )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
