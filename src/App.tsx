import { ErrorBoundary } from '@/pages/error/ErrorBoundary';
import ErrorPage from '@/pages/error/ErrorPage';
import HomePage from '@/pages/home/HomePage';
import SearchPage from '@/pages/home/SearchPage';
import NotificationsPage from '@/pages/notifications/NotificationsPage';
import PromotionPage from '@/pages/placeholders/PromotionPage';
import VipPage from '@/pages/placeholders/VipPage';
import AirdropPage from '@/pages/project/AirdropPage';
import DetailPage from '@/pages/project/DetailPage';
import DisclosurePage from '@/pages/project/DisclosurePage';
import ExchangePage from '@/pages/project/ExchangePage';
import FixedPricePage from '@/pages/project/FixedPricePage';
import FixedPriceSaleDetailPage from '@/pages/project/FixedPriceSaleDetailPage';
import HoldersPage from '@/pages/project/HoldersPage';
import KlinePage from '@/pages/project/KlinePage';
import MeteoraPage from '@/pages/project/MeteoraPage';
import MilestonesPage from '@/pages/project/MilestonesPage';
import MinePage from '@/pages/project/MinePage';
import TradePage from '@/pages/project/TradePage';
import VestingPage from '@/pages/project/VestingPage';
import RulesPage from '@/pages/rules/RulesPage';
import AdminHub from '@/pages/admin/AdminHub';
import StudioBills from '@/pages/studio/StudioBills';
import StudioHome from '@/pages/studio/StudioHome';
import StudioWallet from '@/pages/studio/StudioWallet';
import StudioNewStep1 from '@/pages/studio/new/Step1';
import StudioNewStep2 from '@/pages/studio/new/Step2';
import StudioNewStep3 from '@/pages/studio/new/Step3';
import StudioNewStep4 from '@/pages/studio/new/Step4';
import StudioNewStep5 from '@/pages/studio/new/Step5';
import StudioProjectAirdropPhases from '@/pages/studio/project/AirdropPhases';
import StudioProjectDeposit from '@/pages/studio/project/Deposit';
import StudioProjectEdit from '@/pages/studio/project/Edit';
import StudioMilestoneList from '@/pages/studio/project/MilestoneList';
import StudioMilestoneNodeDetail from '@/pages/studio/project/MilestoneNodeDetail';
import StudioProjectOnChain from '@/pages/studio/project/OnChain';
import StudioProjectOverview from '@/pages/studio/project/Overview';
import StudioProjectProgress from '@/pages/studio/project/Progress';
import StudioProjectReconcile from '@/pages/studio/project/Reconcile';
import StudioProjectReview from '@/pages/studio/project/Review';
import StudioProjectFixedPriceApply from '@/pages/studio/project/FixedPriceApply';
import StudioProjectVault from '@/pages/studio/project/Vault';
import BillsPage from '@/pages/wallet/BillsPage';
import RechargePage from '@/pages/wallet/RechargePage';
import WalletPage from '@/pages/wallet/WalletPage';
import WithdrawPage from '@/pages/wallet/WithdrawPage';
import { ConnectWalletSheet } from '@/components/sheets/ConnectWalletSheet';
import { DebugSheet } from '@/components/sheets/DebugSheet';
import { LanguageSheet } from '@/components/sheets/LanguageSheet';
import { ProfileSheet } from '@/components/sheets/ProfileSheet';
import { RequireInvestorOutlet } from '@/routes/guards';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/vip" element={<VipPage />} />
          <Route path="/promotion" element={<PromotionPage />} />
          <Route path="/project/:id" element={<DetailPage />} />
          <Route path="/project/:id/trade" element={<TradePage />} />
          <Route path="/project/:id/kline" element={<KlinePage />} />
          <Route path="/project/:id/holders" element={<HoldersPage />} />
          <Route path="/project/:id/mine" element={<MinePage />} />
          <Route path="/project/:id/airdrop" element={<AirdropPage />} />
          <Route path="/project/:id/exchange" element={<ExchangePage />} />
          <Route path="/project/:id/meteora" element={<MeteoraPage />} />
          <Route path="/project/:id/fixed-price" element={<FixedPricePage />} />
          <Route path="/project/:id/fixed-price/:saleId" element={<FixedPriceSaleDetailPage />} />
          <Route path="/project/:id/vesting" element={<VestingPage />} />
          <Route path="/project/:id/milestones" element={<MilestonesPage />} />
          <Route path="/project/:id/disclosure" element={<DisclosurePage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/wallet/recharge" element={<RechargePage />} />
          <Route path="/wallet/withdraw" element={<WithdrawPage />} />
          <Route path="/wallet/bills" element={<BillsPage />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route element={<RequireInvestorOutlet />}>
            <Route path="/studio" element={<StudioHome />} />
            <Route path="/studio/wallet" element={<StudioWallet />} />
            <Route path="/studio/bills" element={<StudioBills />} />
            <Route path="/studio/new/step1" element={<StudioNewStep1 />} />
            <Route path="/studio/new/step2" element={<StudioNewStep2 />} />
            <Route path="/studio/new/step3" element={<StudioNewStep3 />} />
            <Route path="/studio/new/step4" element={<StudioNewStep4 />} />
            <Route path="/studio/new/step5" element={<StudioNewStep5 />} />
            <Route path="/studio/project/:id" element={<StudioProjectEdit />} />
            <Route path="/studio/project/:id/overview" element={<StudioProjectOverview />} />
            <Route path="/studio/project/:id/deposit" element={<StudioProjectDeposit />} />
            <Route path="/studio/project/:id/review" element={<StudioProjectReview />} />
            <Route path="/studio/project/:id/on-chain" element={<StudioProjectOnChain />} />
            <Route path="/studio/project/:id/airdrop-phases" element={<StudioProjectAirdropPhases />} />
            <Route path="/studio/project/:id/milestone" element={<StudioMilestoneList />} />
            <Route path="/studio/project/:id/milestone/:step" element={<StudioMilestoneNodeDetail />} />
            <Route path="/studio/project/:id/progress" element={<StudioProjectProgress />} />
            <Route path="/studio/project/:id/reconcile" element={<StudioProjectReconcile />} />
            <Route path="/studio/project/:id/fixed-price" element={<StudioProjectFixedPriceApply />} />
            <Route path="/studio/project/:id/vault" element={<StudioProjectVault />} />
          </Route>
          <Route path="/arts/admin" element={<AdminHub />} />
          <Route path="/404" element={<ErrorPage />} />
          <Route path="*" element={<ErrorPage />} />
        </Routes>
        <ConnectWalletSheet />
        <LanguageSheet />
        <DebugSheet />
        <ProfileSheet />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
