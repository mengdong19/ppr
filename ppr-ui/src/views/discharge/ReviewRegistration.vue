<template>
  <v-container class="view-container pa-15 pt-14" fluid style="min-width: 960px;">
    <v-overlay v-model="loading">
      <v-progress-circular color="primary" size="50" indeterminate />
    </v-overlay>
    <base-dialog
      :setOptions="options"
      :setDisplay="showCancelDialog"
      @proceed="handleDialogResp($event)"
    />
    <div v-if="dataLoaded && !dataLoadError" class="container pa-0" style="min-width: 960px;">
      <v-row no-gutters>
        <v-col cols="9">
          <h1>Total Discharge</h1>
          <div style="padding-top: 25px; max-width: 875px;">
            <p class="ma-0">
              This is the current information for this registration as of
              <b>{{ asOfDateTime }}.</b><br/>
              If additional amendments including court orders are still required, ensure they are completed
              prior to performing this Total Discharge.
            </p>
            <p class="ma-0 pt-5">
              To view the full history of this registration including descriptions of any
              previous amendments or court orders, you will need to conduct a separate search.
            </p>
          </div>
          <caution-box class="mt-9" :setMsg="cautionTxt" :setImportantWord="'Note'"/>
          <registration-length-trust-summary class="mt-15" />
          <div class="summary-header mt-15 pa-4 rounded-top">
            <v-icon color="darkBlue">mdi-account-multiple-plus</v-icon>
            <label class="pl-3">
              <strong>Registering Party, Secured Parties, and Debtors</strong>
            </label>
          </div>
          <h3 class="pt-6">Original Registering Party</h3>
          <registering-party-summary class="pt-4" :setEnableNoDataAction="false" />
          <h3 class="pt-6">Secured Parties</h3>
          <secured-party-summary class="pt-4" :setEnableNoDataAction="false" />
          <h3 class="pt-6">Debtors</h3>
          <debtor-summary class="pt-4" :setEnableNoDataAction="false" />
          <collateral class="mt-15" :isSummary="true" />
        </v-col>
        <v-col class="pl-6" cols="3">
          <aside>
            <affix relative-element-selector=".col-9" :offset="{ top: 90, bottom: -100 }">
              <sticky-container
                :setRightOffset="true"
                :setShowButtons="true"
                :setShowFeeSummary="true"
                :setFeeType="feeType"
                :setRegistrationType="registrationTypeUI"
                :setCancelBtn="'Cancel'"
                :setSubmitBtn="'Confirm and Complete'"
                @cancel="showCancelDialog = true"
                @submit="confirmDischarge()"
              />
            </affix>
          </aside>
        </v-col>
      </v-row>
    </div>
  </v-container>
</template>

<script lang="ts">
// external
import { Component, Emit, Prop, Vue, Watch } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
// bcregistry
import { SessionStorageKeys } from 'sbc-common-components/src/util/constants'
// local components
import { CautionBox, StickyContainer } from '@/components/common'
import { BaseDialog } from '@/components/dialogs'
import { RegistrationLengthTrustSummary } from '@/components/registration'
import { Collateral } from '@/components/collateral'
import { DebtorSummary, RegisteringPartySummary, SecuredPartySummary } from '@/components/parties/summaries'
// local helpers/enums/interfaces/resources
import {
  APIRegistrationTypes, // eslint-disable-line no-unused-vars
  RouteNames, // eslint-disable-line no-unused-vars
  RegistrationFlowType, // eslint-disable-line no-unused-vars
  UIRegistrationTypes // eslint-disable-line no-unused-vars
} from '@/enums'
import { FeeSummaryTypes } from '@/composables/fees/enums'
import {
  ActionBindingIF, ErrorIF, AddPartiesIF, // eslint-disable-line no-unused-vars
  RegistrationTypeIF, AddCollateralIF, LengthTrustIF, // eslint-disable-line no-unused-vars
  CertifyIF, DebtorNameIF, DialogOptionsIF // eslint-disable-line no-unused-vars
} from '@/interfaces'
import { AllRegistrationTypes } from '@/resources'
import { notCompleteDialog } from '@/resources/dialogOptions'
import { getFeatureFlag, getFinancingStatement, pacificDate } from '@/utils'

@Component({
  components: {
    BaseDialog,
    CautionBox,
    RegistrationLengthTrustSummary,
    Collateral,
    DebtorSummary,
    RegisteringPartySummary,
    SecuredPartySummary,
    StickyContainer
  }
})
export default class ReviewRegistration extends Vue {
  @Getter getConfirmDebtorName: DebtorNameIF
  @Getter getRegistrationType: RegistrationTypeIF

  @Action setAddCollateral: ActionBindingIF
  @Action setAddSecuredPartiesAndDebtors: ActionBindingIF
  @Action setLengthTrust: ActionBindingIF
  @Action setOriginalAddSecuredPartiesAndDebtors: ActionBindingIF
  @Action setRegistrationCreationDate: ActionBindingIF
  @Action setRegistrationExpiryDate: ActionBindingIF
  @Action setRegistrationNumber: ActionBindingIF
  @Action setRegistrationType: ActionBindingIF
  @Action setRegistrationFlowType: ActionBindingIF
  @Action setCertifyInformation: ActionBindingIF
  @Action setFolioOrReferenceNumber: ActionBindingIF
  @Action setUnsavedChanges: ActionBindingIF

  /** Whether App is ready. */
  @Prop({ default: false })
  private appReady: boolean

  @Prop({ default: false })
  private isJestRunning: boolean

  private cautionTxt =
    'The Registry will provide the verification statement to all Secured Parties named in this registration.'

  private dataLoaded = false // eslint-disable-line lines-between-class-members
  private dataLoadError = false
  private feeType = FeeSummaryTypes.DISCHARGE
  private financingStatementDate: Date = null
  private loading = false
  private options: DialogOptionsIF = notCompleteDialog
  private showCancelDialog = false

  private get asOfDateTime (): string {
    // return formatted date
    if (this.financingStatementDate) {
      return `${pacificDate(this.financingStatementDate)}`
    }
    return ''
  }

  private get isAuthenticated (): boolean {
    return Boolean(sessionStorage.getItem(SessionStorageKeys.KeyCloakToken))
  }

  // the number of the registration being discharged
  private get registrationNumber (): string {
    return this.$route.query['reg-num'] as string || ''
  }

  private get registrationTypeUI (): UIRegistrationTypes {
    return this.getRegistrationType?.registrationTypeUI || null
  }

  private get registrationType (): APIRegistrationTypes {
    return this.getRegistrationType?.registrationTypeAPI || null
  }

  private handleDialogResp (val: boolean): void {
    this.showCancelDialog = false
    if (!val) {
      this.setRegistrationNumber(null)
      this.$router.push({ name: RouteNames.DASHBOARD })
    }
  }

  private async loadRegistration (): Promise<void> {
    if (!this.registrationNumber || !this.getConfirmDebtorName) {
      if (!this.registrationNumber) {
        console.error('No registration number given to discharge. Redirecting to dashboard...')
      } else {
        console.error('No debtor name confirmed for discharge. Redirecting to dashboard...')
      }
      this.$router.push({
        name: RouteNames.DASHBOARD
      })
      return
    }
    this.financingStatementDate = new Date()
    const financingStatement = await getFinancingStatement(true, this.registrationNumber)
    if (financingStatement.error) {
      this.dataLoadError = true
      this.emitError(financingStatement.error)
    } else {
      // load data into the store
      const registrationType = AllRegistrationTypes.find(
        (reg, index) => {
          if (reg.registrationTypeAPI === financingStatement.type) {
            return true
          }
        })
      const collateral = {
        valid: true,
        vehicleCollateral: financingStatement.vehicleCollateral,
        generalCollateral: financingStatement.generalCollateral
      } as AddCollateralIF
      const lengthTrust = {
        valid: true,
        trustIndenture: financingStatement.trustIndenture || false,
        lifeInfinite: financingStatement.lifeInfinite || false,
        lifeYears: financingStatement.lifeYears || null,
        surrenderDate: financingStatement.surrenderDate || null,
        lienAmount: financingStatement.lienAmount || null
      } as LengthTrustIF
      const parties = {
        valid: true,
        registeringParty: null, // will be taken from account info
        securedParties: financingStatement.securedParties,
        debtors: financingStatement.debtors
      } as AddPartiesIF
      const origParties = {
        registeringParty: financingStatement.registeringParty, // will be used for summary
        securedParties: financingStatement.securedParties,
        debtors: financingStatement.debtors
      } as AddPartiesIF
      const certifyInfo: CertifyIF = {
        valid: false,
        certified: false,
        legalName: '',
        registeringParty: null
      }
      this.setRegistrationCreationDate(financingStatement.createDateTime)
      this.setRegistrationExpiryDate(financingStatement.expiryDate)
      this.setRegistrationNumber(financingStatement.baseRegistrationNumber)
      this.setRegistrationType(registrationType)
      this.setAddCollateral(collateral)
      this.setLengthTrust(lengthTrust)
      this.setAddSecuredPartiesAndDebtors(parties)
      this.setOriginalAddSecuredPartiesAndDebtors(origParties)
      this.setRegistrationFlowType(RegistrationFlowType.DISCHARGE)
      this.setFolioOrReferenceNumber('')
      this.setCertifyInformation(certifyInfo)
    }
  }

  mounted () {
    this.onAppReady(this.appReady)
  }

  private confirmDischarge (): void {
    this.$router.push({
      name: RouteNames.CONFIRM_DISCHARGE,
      query: { 'reg-num': this.registrationNumber }
    })
  }

  /** Emits error to app.vue for handling */
  @Emit('error')
  private emitError (error: ErrorIF): void {
    console.error(error)
  }

  /** Emits Have Data event. */
  @Emit('haveData')
  private emitHaveData (haveData: Boolean = true): void { }

  /** Called when App is ready and this component can load its data. */
  @Watch('appReady')
  private async onAppReady (val: boolean): Promise<void> {
    // do not proceed if app is not ready
    if (!val) return
    // redirect if not authenticated (safety check - should never happen) or if app is not open to user (ff)
    if (!this.isAuthenticated || (!this.isJestRunning && !getFeatureFlag('ppr-ui-enabled'))) {
      this.$router.push({
        name: RouteNames.DASHBOARD
      })
      return
    }

    // get registration data from api and load into store
    this.loading = true
    await this.loadRegistration()
    this.loading = false

    // page is ready to view
    this.emitHaveData(true)
    this.dataLoaded = true
  }
}
</script>

<style lang="scss" module>
@import '@/assets/styles/theme.scss';
</style>
