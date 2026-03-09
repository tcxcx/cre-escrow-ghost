import { createClient } from '@bu/supabase/job';
import {
  updateReportCompletion,
  updateReportPdfUrl,
} from '@bu/supabase/mutations';
import { getReportTokenQuery } from '@bu/supabase/queries';
import { schemaTask, logger } from '@trigger.dev/sdk';
import { format, parseISO } from 'date-fns';
import QRCode from 'qrcode';
import { ReportPdfTemplate, renderToStream } from '@bu/invoice';
import { compileReportSchema } from '../../src/schemas/report.schemas';
import type {
  TransactionData,
  AIAnalysisResult,
  FinancialAnalyticsResult,
  VisualizationData,
  ChartImagesResult,
  ReportContent,
  ReportHeader,
  ExecutiveSummary,
  ReportSection,
  UnifiedAnalyticsData,
  ProjectionSettings,
} from '../../src/types/report.types';
import { projectExpenseSeries, projectSeries, shouldIncludeCurrency } from '../../src/utils/projections';

/**
 * Compile Unified Analytics Report Task
 *
 * Final step in report generation that:
 * - Generates a unique report number
 * - Creates QR code for public verification
 * - Assembles all unified analytics content into final structure
 * - Includes chart images for PDF rendering
 * - Saves the completed report to the database
 */
export const compileReport = schemaTask({
  id: 'compile-report',
  schema: compileReportSchema,
  maxDuration: 120,
  queue: { concurrencyLimit: 10 },
  machine: { preset: 'small-1x' },

  run: async ({
    reportId,
    teamId,
    transactionData,
    aiAnalysis,
    financialAnalytics,
    visualizations,
    chartImages,
    baseUrl,
    title,
    description,
    fromDate,
    toDate,
    projectionSettings,
    currencyScope,
    reportSections,
  }) => {
    const supabase = createClient();
    const txData = transactionData as TransactionData & { unifiedAnalytics?: UnifiedAnalyticsData; currency?: string };
    const aiData = aiAnalysis as AIAnalysisResult;
    const finData = financialAnalytics as FinancialAnalyticsResult;
    const vizData = visualizations as VisualizationData;
    const chartImagesData = chartImages as ChartImagesResult | undefined;
    const unifiedAnalytics = txData.unifiedAnalytics;
    const currency = txData.currency || 'USD';
    const scenario: ProjectionSettings = projectionSettings || { enabled: false, growthRate: 'auto', forecastMonths: 3 };
    const scope = currencyScope || 'ALL';
    
    // Default all sections to true if not provided (backwards compatibility)
    const sectionConfig = reportSections || {
      transactions: true,
      bankAccounts: true,
      wallets: true,
      cryptoAssets: true,
      cashFlow: true,
      categorySpending: true,
      revenueForecast: true,
      growthTrends: true,
      expensesBreakdown: true,
      healthScore: true,
      paymentScore: true,
      runway: true,
      profitTrend: true,
      burnRateTrend: true,
      aiAnalysis: true,
    };

    logger.info('[compile-report] Starting unified analytics report compilation', { 
      reportId, 
      teamId,
      enabledSections: Object.entries(sectionConfig).filter(([, v]) => v).map(([k]) => k).length,
    });

    // Generate report number
    const reportNumber = `UAR-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    // Get report token and generate QR code
    const { data: reportData, error: fetchError } = await getReportTokenQuery(supabase, reportId);

    if (fetchError) {
      logger.error('[compile-report] Failed to fetch token', { error: fetchError.message, reportId });
      throw new Error(`Failed to fetch report token: ${fetchError.message}`);
    }

    const reportUrl = `${baseUrl}/ai-report/${reportData?.token}`;
    const qrCodeData = await QRCode.toDataURL(reportUrl, {
      width: 200,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    // Assemble content
    const reportTitle = title || `Unified Analytics Report - ${format(parseISO(fromDate), 'MMM yyyy')} to ${format(parseISO(toDate), 'MMM yyyy')}`;

    const header: ReportHeader = {
      title: reportTitle,
      subtitle: `Analysis Period: ${format(parseISO(fromDate), 'MMM dd, yyyy')} to ${format(parseISO(toDate), 'MMM dd, yyyy')}`,
      generatedAt: new Date().toISOString(),
      reportNumber,
    };

    // Build executive summary with unified analytics data
    const executiveSummary: ExecutiveSummary = {
      keyMetrics: {
        totalBalance: unifiedAnalytics?.allAccountsBalance?.totalBalance || 0,
        monthlyIncome: txData.summary.totalIncome,
        monthlyExpenses: txData.summary.totalExpenses,
        savingsRate: finData.ratios.savingsRate,
        runwayMonths: unifiedAnalytics?.runway?.months,
        growthRate: unifiedAnalytics?.growthRate?.rate,
      },
      highlights: aiData.summary.keyInsights,
      recommendations: aiData.predictions.recommendations,
    };

    // Build comprehensive sections for unified analytics
    const sections: ReportSection[] = [
      {
        title: 'Financial Overview',
        content: {
          profit: unifiedAnalytics?.profit,
          revenue: unifiedAnalytics?.revenue,
          burnRate: unifiedAnalytics?.burnRate,
          currency,
        },
        visualizations: [vizData.charts.trendAnalysis],
        chartImage: chartImagesData?.combinedFinancialChart || undefined,
      },
      // Projections are stored in content and rendered by the PDF template
      {
        title: 'Cash Flow Analysis',
        content: {
          totalInflow: finData.cashFlow.totalInflow,
          totalOutflow: finData.cashFlow.totalOutflow,
          netCashFlow: finData.cashFlow.netCashFlow,
          monthlyBreakdown: finData.cashFlow.monthlyBreakdown,
        },
        visualizations: [vizData.charts.cashFlowChart],
        chartImage: chartImagesData?.cashFlowChart || undefined,
      },
      {
        title: 'Category Spending',
        content: {
          categories: unifiedAnalytics?.categorySpending?.data || [],
          incomeCategories: finData.categorization.incomeCategories,
          expenseCategories: finData.categorization.expenseCategories,
        },
        visualizations: [vizData.charts.categoryBreakdown],
        chartImage: chartImagesData?.categorySpendingChart || undefined,
      },
      {
        title: 'Revenue Forecast',
        content: {
          forecastData: unifiedAnalytics?.revenueForecast?.data || [],
          currency,
        },
        visualizations: [],
        chartImage: chartImagesData?.revenueForecastChart || undefined,
      },
      {
        title: 'Growth & Trends',
        content: {
          growthRate: unifiedAnalytics?.growthRate,
          trends: aiData.trends,
        },
        visualizations: [vizData.charts.monthlyComparison],
        chartImage: chartImagesData?.growthRateChart || undefined,
      },
      {
        title: 'Expenses Breakdown',
        content: {
          expenses: unifiedAnalytics?.expenses,
          performance: finData.performance,
        },
        visualizations: [],
        chartImage: chartImagesData?.expensesChart || undefined,
      },
      {
        title: 'Account Balances',
        content: {
          allAccountsBalance: unifiedAnalytics?.allAccountsBalance,
          runway: unifiedAnalytics?.runway,
        },
        visualizations: [],
      },
      {
        title: 'AI Insights & Predictions',
        content: aiData,
        visualizations: [],
      },
    ];

    const finalContent: ReportContent = {
      header,
      executiveSummary,
      aiAnalysis: {
        paragraphs: aiData.paragraphs,
        trends: aiData.trends,
        predictions: aiData.predictions,
      },
      sections,
      unifiedAnalytics,
      chartImages: chartImagesData,
      projections: {
        enabled: scenario.enabled,
        growthRate: scenario.growthRate,
        forecastMonths: scenario.forecastMonths,
        currencyScope: scope,
        byCurrency: (() => {
          if (!scenario.enabled || !unifiedAnalytics) return {};

          const currencies = [
            ...new Set([
              ...(unifiedAnalytics.profit?.data || []).map((d) => d.currency),
              ...(unifiedAnalytics.revenue?.data || []).map((d) => d.currency),
              ...(unifiedAnalytics.burnRate?.data || []).map((d) => d.currency),
              ...(unifiedAnalytics.expenses?.data || []).map((d) => d.currency),
            ]),
          ]
            .filter(Boolean)
            .filter((c) => shouldIncludeCurrency(scope, c))
            .sort();

          const byCurrency: Record<string, { currency: string; rows: Array<{ month: string; revenue: number; expenses: number; profit: number; burnRate: number }> }> = {};
          for (const cur of currencies) {
            const profitSeries = (unifiedAnalytics.profit?.data || []).filter((d) => d.currency === cur);
            const revenueSeries = (unifiedAnalytics.revenue?.data || []).filter((d) => d.currency === cur);
            const burnSeries = (unifiedAnalytics.burnRate?.data || []).filter((d) => d.currency === cur);
            const expenseSeries = (unifiedAnalytics.expenses?.data || []).filter((d) => d.currency === cur);

            const hasAnyActivity =
              profitSeries.some((d) => d.value !== 0) ||
              revenueSeries.some((d) => d.value !== 0) ||
              burnSeries.some((d) => d.value !== 0) ||
              expenseSeries.some((d) => (d.value || 0) !== 0 || (d.recurring_value || 0) !== 0);

            if (!hasAnyActivity) continue;

            const projectedProfit = projectSeries(profitSeries, scenario).filter((d) => d.isProjected);
            const projectedRevenue = projectSeries(revenueSeries, scenario).filter((d) => d.isProjected);
            const projectedBurn = projectSeries(burnSeries, scenario).filter((d) => d.isProjected);
            const projectedExpenses = projectExpenseSeries(expenseSeries, scenario).filter((d) => d.isProjected);

            const rows = projectedRevenue.map((r, idx) => {
              const month = r.date;
              const profit = projectedProfit[idx]?.value ?? 0;
              const burnRate = projectedBurn[idx]?.value ?? 0;
              const expenses =
                (projectedExpenses[idx]?.value ?? 0) + (projectedExpenses[idx]?.recurring_value ?? 0);

              return {
                month,
                revenue: r.value ?? 0,
                expenses,
                profit,
                burnRate,
              };
            });

            byCurrency[cur] = {
              currency: cur,
              rows,
            };
          }

          return byCurrency;
        })(),
      },
      appendix: {
        methodology: 'AI-powered unified financial analysis using Claude Sonnet, aggregating data from bank accounts, crypto wallets, and blockchain transactions.',
        dataSource: 'Comprehensive transaction data from all connected accounts including traditional banking, cryptocurrency exchanges, and blockchain wallets.',
        disclaimers: 'This report is for informational purposes only and should not be considered as financial advice. Past performance does not guarantee future results.',
      },
      reportNumber,
      // Section visibility configuration for PDF rendering
      reportSections: sectionConfig,
    };

    // Save to database
    const completionParams = {
      report_number: reportNumber,
      title: reportTitle,
      description: description || 'Comprehensive unified analytics report covering all financial data',
      content: finalContent,
      ai_insights: aiData,
      financial_analytics: finData,
      visualizations: {
        ...vizData,
        chartImages: chartImagesData as unknown as Record<string, unknown>,
      },
      qr_code_data: qrCodeData,
      generation_metadata: {
        completedAt: new Date().toISOString(),
        reportType: 'unified_analytics',
        transactionCount: txData.transactions.length,
        aiModel: 'claude-sonnet-4-20250514',
        chartsGenerated: chartImagesData ? Object.keys(chartImagesData).filter(k => chartImagesData[k as keyof ChartImagesResult] !== null && k !== 'generatedAt').length : 0,
        projectionSettings: scenario as unknown as Record<string, unknown>,
        currencyScope: scope,
        unifiedSources: {
          hasBankData: (unifiedAnalytics?.allAccountsBalance?.bankBalance || 0) > 0,
          hasWalletData: (unifiedAnalytics?.allAccountsBalance?.walletBalance || 0) > 0,
          hasCryptoData: (unifiedAnalytics?.allAccountsBalance?.cryptoBalance || 0) > 0,
        },
      },
    };
    const { error: updateError } = await updateReportCompletion(supabase, reportId, completionParams as any);

    if (updateError) {
      logger.error('[compile-report] Failed to save', { error: updateError.message, reportId });
      throw new Error(`Failed to save report: ${updateError.message}`);
    }

    logger.info('[compile-report] Unified analytics report completed', { reportId, reportNumber });

    // =========================================================================
    // GENERATE PDF AND UPLOAD TO STORAGE
    // This pre-generates the PDF so downloads are instant (~200ms vs 3-8s)
    // =========================================================================
    logger.info('[compile-report] Generating PDF for storage', { reportId });

    let pdfSaved = false;
    try {
      // Prepare PDF data (mirrors what download route uses)
      const pdfData = {
        report_number: reportNumber,
        title: reportTitle,
        description: description || 'Comprehensive unified analytics report covering all financial data',
        from_date: fromDate,
        to_date: toDate,
        currency,
        status: 'completed' as const,
        content: finalContent,
        ai_insights: aiData,
        financial_analytics: finData,
        visualizations: { ...vizData, chartImages: chartImagesData },
        qr_code_data: qrCodeData,
        short_link: null, // Will be generated on first web access
        report_url: reportUrl,
        generated_at: new Date().toISOString(),
        team: null, // Optional, fetched separately on download
        logo_url: null,
      };

      // Generate PDF buffer
      const reportTemplate = await ReportPdfTemplate(pdfData as unknown as Parameters<typeof ReportPdfTemplate>[0]);
      const pdfStream = await renderToStream(reportTemplate);
      const chunks: Buffer[] = [];
      for await (const chunk of pdfStream) {
        chunks.push(chunk as Buffer);
      }
      const pdfBuffer = Buffer.concat(chunks);

      // Upload to storage
      const pdfPath = `reports/${teamId}/${reportId}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('vault')
        .upload(pdfPath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) {
        logger.warn('[compile-report] Failed to upload PDF to storage', { 
          error: uploadError.message, 
          reportId,
          pdfPath,
        });
      } else {
        // Save storage path to database
        const { error: pdfUrlError } = await updateReportPdfUrl(supabase, reportId, pdfPath);

        if (pdfUrlError) {
          logger.warn('[compile-report] Failed to save pdf_url', { error: pdfUrlError.message, reportId });
        } else {
          pdfSaved = true;
          logger.info('[compile-report] PDF saved to storage', { 
            reportId, 
            pdfPath,
            pdfSize: pdfBuffer.length,
          });
        }
      }
    } catch (pdfError) {
      // Don't fail the entire report if PDF generation fails
      // The download route will fall back to generating on-demand
      logger.warn('[compile-report] PDF generation failed, will generate on-demand', { 
        error: pdfError instanceof Error ? pdfError.message : String(pdfError),
        reportId,
      });
    }

    // Trigger CRE on-chain attestation (fire-and-forget, does not block report flow).
    // Payload matches workflow-report-verify handler: { reportId, teamId }
    try {
      const creGatewayUrl = process.env.CRE_GATEWAY_URL ?? 'http://localhost:8088';
      const creUrl = `${creGatewayUrl}/workflows/workflow-report-verify/trigger`;
      const creResp = await fetch(creUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'report_verify',
          reportId,
          teamId,
        }),
      });
      if (!creResp.ok) {
        const errText = await creResp.text().catch(() => 'unknown');
        logger.warn('[compile-report] CRE report verify HTTP error', { status: creResp.status, errText });
      } else {
        logger.info('[compile-report] CRE report verification triggered', { reportId });
      }
    } catch (creErr) {
      logger.warn('[compile-report] CRE report verify failed (non-fatal)', {
        error: (creErr as Error).message,
      });
    }

    return {
      reportId,
      reportNumber,
      qrCodeGenerated: true,
      saved: true,
      pdfSaved,
      completedAt: new Date().toISOString(),
      sectionsCount: sections.length,
      chartsIncluded: chartImagesData ? Object.keys(chartImagesData).filter(k => chartImagesData[k as keyof ChartImagesResult] !== null && k !== 'generatedAt').length : 0,
    };
  },
});
