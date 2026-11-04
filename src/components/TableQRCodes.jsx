
import { QRCodeSVG } from 'qrcode.react'

const tables = [
  {
    number: '01',
    token: '4b4acc89-df0c-4da6-922a-90f1238204f5',
  },
  {
    number: '02',
    token: '9b83874d-aca6-4c81-9bea-5a5efb8c5ab3',
  },
  {
    number: '03',
    token: '0659a612-ade7-462f-8454-c644d55bee38',
  },
  {
    number: '04',
    token: 'a771e539-ff86-48ad-bb5e-b1ff1c09d0d3',
  },
  {
    number: '05',
    token: '8aaad1e6-fa18-4351-bbd2-798a5dcac738',
  },
]

// IP Address ของ Mac สำหรับทดสอบผ่าน Wi-Fi เดียวกัน
const baseUrl = 'https://stunning-marshmallow-7c9072.netlify.app'

function TableQRCodes() {
  function getTableUrl(token) {
    return `${baseUrl}/?table_token=${token}`
  }

  function printQRCodes() {
    window.print()
  }

  async function copyUrl(url) {
    try {
      await navigator.clipboard.writeText(url)
      window.alert('คัดลอกลิงก์สำเร็จ')
    } catch {
      window.prompt('คัดลอกลิงก์นี้:', url)
    }
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20,
      }}>
        <div>
          <h2 style={{ margin: '0 0 6px' }}>
            Table QR Codes
          </h2>

          <p style={{ color: '#718078', margin: 0 }}>
            QR Code สำหรับให้ลูกค้าสแกนเพื่อสั่งอาหาร
          </p>
        </div>

        <button
          onClick={printQRCodes}
          style={{
            background: '#176b45',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '11px 16px',
            cursor: 'pointer',
          }}
        >
          🖨️ พิมพ์ QR Codes
        </button>
      </div>

      <div
        className="table-qr-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 20,
        }}
      >
        {tables.map(table => {
          const url = getTableUrl(table.token)

          return (
            <div
              key={table.number}
              className="table-qr-card"
              style={{
                background: 'white',
                border: '1px solid #e5eee8',
                borderRadius: 14,
                padding: 22,
                textAlign: 'center',
                breakInside: 'avoid',
              }}
            >
              <h2 style={{
                color: '#176b45',
                marginTop: 0,
              }}>
                TABLE {table.number}
              </h2>

              <QRCodeSVG
                value={url}
                size={180}
                level="H"
                includeMargin
              />

              <p style={{
                fontSize: 12,
                color: '#718078',
                overflowWrap: 'anywhere',
                marginTop: 15,
              }}>
                สแกนเพื่อสั่งอาหาร
              </p>

              <button
                onClick={() => copyUrl(url)}
                style={{
                  background: '#eaf4ed',
                  color: '#176b45',
                  border: 'none',
                  borderRadius: 7,
                  padding: '9px 13px',
                  cursor: 'pointer',
                }}
              >
                คัดลอกลิงก์
              </button>
            </div>
          )
        })}
      </div>

      <style>{`
        @media print {
          body {
            background: white !important;
          }

          button {
            display: none !important;
          }

          .table-qr-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }

          .table-qr-card {
            border: 1px solid #999 !important;
          }
        }
      `}</style>
    </div>
  )
}

export default TableQRCodes
