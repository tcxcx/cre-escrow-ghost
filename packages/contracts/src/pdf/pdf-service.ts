import { renderToBuffer } from '@react-pdf/renderer'
import { AgreementPdf } from './agreement-pdf'
import type { AgreementJSON } from '../agreement/schema'
import React from 'react'

export async function generateAgreementPdf(agreement: AgreementJSON): Promise<Buffer> {
  return renderToBuffer(React.createElement(AgreementPdf, { agreement }))
}
