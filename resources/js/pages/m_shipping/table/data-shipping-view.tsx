import React from 'react';

type FlashMessage = {
    success?: string | null;
    error?: string | null;
};

type DocumentItem = {
    id: number;
    nama_file: string | null;
    url_path_file?: string | null;
    verify?: boolean | null;
    updated_at: string | null;
    updated_at_full?: string | null;
};

type Props = {
    documents: DocumentItem[];
    flash?: FlashMessage;
};

const DataShippingView: React.FC<Props> = ({ documents, flash }) => {
    return (
        <div style={styles.page}>
            <div style={styles.wrapper}>
                <div style={styles.paper}>
                    <div style={styles.headerBox}>
                        <div style={styles.headerTitle}>VIEW DATA DOKUMEN SHIPMENT</div>
                        <div style={styles.headerSubtitle}>
                            List dokumen dari table <b>document_trans</b>
                        </div>
                    </div>

                    {(flash?.success || flash?.error) && (
                        <div
                            style={{
                                ...styles.flashBox,
                                backgroundColor: flash?.error ? '#fdeaea' : '#eaf7ea',
                                borderColor: flash?.error ? '#f1b5b5' : '#bde0bd',
                                color: flash?.error ? '#a94442' : '#2d6a2d',
                            }}
                        >
                            {flash?.success || flash?.error}
                        </div>
                    )}

                    <div style={styles.infoRow}>
                        <div style={styles.infoLabel}>TOTAL DOKUMEN</div>
                        <div style={styles.infoValue}>{documents?.length ?? 0}</div>
                    </div>

                    <div style={styles.tableSection}>
                        <div style={styles.sectionTitle}>LIST DOKUMEN</div>

                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={{ ...styles.th, width: '60px' }}>NO</th>
                                    <th style={styles.th}>NAMA FILE</th>
                                    <th style={{ ...styles.th, width: '180px' }}>TANGGAL</th>
                                    <th style={{ ...styles.th, width: '140px' }}>STATUS</th>
                                    <th style={{ ...styles.th, width: '120px' }}>AKSI</th>
                                </tr>
                            </thead>
                            <tbody>
                                {documents && documents.length > 0 ? (
                                    documents.map((doc, index) => (
                                        <tr key={doc.id}>
                                            <td style={styles.tdCenter}>{index + 1}</td>
                                            <td style={styles.td}>
                                                <div style={styles.fileName}>{doc.nama_file || '-'}</div>
                                            </td>
                                            <td style={styles.tdCenter}>{doc.updated_at || '-'}</td>
                                            <td style={styles.tdCenter}>
                                                <span
                                                    style={{
                                                        ...styles.badge,
                                                        backgroundColor: doc.verify ? '#dff3e2' : '#fff4d6',
                                                        color: doc.verify ? '#1f6b2a' : '#8a6d1d',
                                                        border: doc.verify ? '1px solid #b7dec0' : '1px solid #ead89a',
                                                    }}
                                                >
                                                    {doc.verify ? 'Verified' : 'Pending'}
                                                </span>
                                            </td>
                                            <td style={styles.tdCenter}>
                                                {doc.url_path_file ? (
                                                    <a href={doc.url_path_file} target="_blank" rel="noreferrer" style={styles.linkButton}>
                                                        Lihat
                                                    </a>
                                                ) : (
                                                    <span style={{ color: '#888' }}>-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} style={styles.emptyCell}>
                                            Belum ada data dokumen.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div style={styles.noteBox}>
                        <div style={styles.noteLabel}>NOTE</div>
                        <div style={styles.noteLine}></div>
                        <div style={styles.noteLine}></div>
                        <div style={styles.noteLine}></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    page: {
        minHeight: '100vh',
        backgroundColor: '#f3f4f6',
        padding: '24px',
    },
    wrapper: {
        maxWidth: '1100px',
        margin: '0 auto',
    },
    paper: {
        backgroundColor: '#ffffff',
        border: '2px solid #222',
        padding: '24px',
        boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
    },
    headerBox: {
        border: '1px solid #222',
        padding: '12px 16px',
        marginBottom: '16px',
        textAlign: 'center',
    },
    headerTitle: {
        fontSize: '20px',
        fontWeight: 700,
        letterSpacing: '0.5px',
    },
    headerSubtitle: {
        marginTop: '6px',
        fontSize: '13px',
        color: '#555',
    },
    flashBox: {
        border: '1px solid',
        borderRadius: '6px',
        padding: '10px 14px',
        marginBottom: '16px',
        fontSize: '14px',
    },
    infoRow: {
        display: 'grid',
        gridTemplateColumns: '200px 1fr',
        marginBottom: '16px',
        border: '1px solid #222',
    },
    infoLabel: {
        borderRight: '1px solid #222',
        padding: '10px 12px',
        fontWeight: 700,
        backgroundColor: '#f8f8f8',
    },
    infoValue: {
        padding: '10px 12px',
        fontWeight: 600,
    },
    tableSection: {
        marginTop: '10px',
    },
    sectionTitle: {
        fontWeight: 700,
        marginBottom: '8px',
        fontSize: '14px',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
    },
    th: {
        border: '1px solid #222',
        backgroundColor: '#e9ecef',
        padding: '10px 8px',
        fontSize: '13px',
        textAlign: 'center',
        fontWeight: 700,
    },
    td: {
        border: '1px solid #222',
        padding: '10px 8px',
        fontSize: '13px',
        verticalAlign: 'middle',
    },
    tdCenter: {
        border: '1px solid #222',
        padding: '10px 8px',
        fontSize: '13px',
        textAlign: 'center',
        verticalAlign: 'middle',
    },
    fileName: {
        fontWeight: 600,
        wordBreak: 'break-word',
    },
    badge: {
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 700,
    },
    linkButton: {
        display: 'inline-block',
        padding: '6px 12px',
        backgroundColor: '#1f4e79',
        color: '#fff',
        borderRadius: '4px',
        textDecoration: 'none',
        fontSize: '12px',
        fontWeight: 600,
    },
    emptyCell: {
        border: '1px solid #222',
        padding: '18px',
        textAlign: 'center',
        color: '#777',
        fontStyle: 'italic',
    },
    noteBox: {
        marginTop: '24px',
    },
    noteLabel: {
        fontSize: '13px',
        fontWeight: 700,
        marginBottom: '8px',
    },
    noteLine: {
        borderBottom: '1px solid #222',
        height: '26px',
        marginBottom: '8px',
    },
};

export default DataShippingView;
