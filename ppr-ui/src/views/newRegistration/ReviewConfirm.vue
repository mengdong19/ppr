<template>
  <v-container v-if="dataLoaded" class="view-container pa-0" fluid>
    <div class="view-container px-15 py-0">
      <div class="container pa-0 pt-4">
        <v-row no-gutters>
          <v-col class="left-page" cols="9">
            <v-row no-gutters
                   id="registration-header"
                   class="length-trust-header pt-3 pb-3 soft-corners-top">
              <v-col cols="auto">
                <h1>{{ registrationTypeUI }}<span class="only-print"> - Draft</span></h1>
              </v-col>
            </v-row>
            <stepper class="mt-4" :showStepErrorsFlag="showStepErrors"/>
            <v-row class='pt-10' no-gutters>
              <v-col cols="auto" class="sub-header">
                Review and Confirm
              </v-col>
            </v-row>
            <v-row no-gutters>
              <v-col class="pt-2 pb-6 sub-header-info">
                Review the information in your registration. If you need to change anything,
                return to the step to make the necessary change.
              </v-col>
            </v-row>
            <v-row no-gutters>
              <v-container fluid class="pa-1">
                <v-row no-gutters class='pt-1'>
                  <v-col>
                    <registration-length-trust-summary />
                  </v-col>
                </v-row>
              </v-container>
            </v-row>
            <v-row no-gutters id="parties-summary">
              <v-container fluid class="ps-1 pt-8">
                <v-row no-gutters class='pt-1'>
                  <v-col>
                    <parties :isSummary="true"/>
                  </v-col>
                </v-row>
              </v-container>
            </v-row>
            <v-row no-gutters>
              <v-container fluid class="ps-1 pt-8">
                <v-row no-gutters class='pt-1'>
                  <v-col>
                    <collateral :isSummary="true" />
                  </v-col>
                </v-row>
              </v-container>
            </v-row>
            <v-row no-gutters>
              <v-container fluid class="ps-1 pt-8">
                <v-row no-gutters class='pt-1'>
                  <v-col>
                    <folio-number-summary :setShowErrors="showStepErrors" @folioValid="validFolio = $event" />
                  </v-col>
                </v-row>
              </v-container>
            </v-row>
            <v-row no-gutters>
              <v-container fluid class="ps-1 pt-8">
                <v-row no-gutters class='pt-1'>
                  <v-col>
                    <certify-information
                      @certifyValid="validCertify = $event"
                      :setShowErrors="showStepErrors"
                      class="pt-10"
                    />
                  </v-col>
                </v-row>
              </v-container>
            </v-row>
          </v-col>
          <v-col class="right-page pl-6 pt-5" cols="3">
            <aside>
              <affix relative-element-selector=".col-9" :offset="{ top: 90, bottom: -100 }">
                <sticky-container
                  :setRightOffset="true"
                  :setShowFeeSummary="true"
                  :setFeeType="feeType"
                  :setRegistrationLength="registrationLength"
                  :setRegistrationType="registrationTypeUI"
                />
              </affix>
            </aside>
          </v-col>
        </v-row>
      </div>
    </div>
    <v-row no-gutters class='pt-15'>
      <v-col cols="12">
        <button-footer
          :currentStatementType="statementType"
          :currentStepName="stepName"
          :router="this.$router"
          :certifyValid="validCertify && validFolio"
          :forceSave="saveDraftExit"
          @registration-incomplete="registrationIncomplete"
          @error="emitError($event)"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
// external
import { Component, Emit, Prop, Vue, Watch } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
// bcregistry
import { SessionStorageKeys } from 'sbc-common-components/src/util/constants'
// local helpers/enums/interfaces/resources
import { APIRegistrationTypes, RegistrationFlowType, RouteNames, StatementTypes } from '@/enums'
import { FeeSummaryTypes } from '@/composables/fees/enums'
import {
  ActionBindingIF, ErrorIF, AddPartiesIF, // eslint-disable-line no-unused-vars
  RegistrationTypeIF, AddCollateralIF, LengthTrustIF // eslint-disable-line no-unused-vars
} from '@/interfaces'
import { RegistrationLengthI } from '@/composables/fees/interfaces' // eslint-disable-line no-unused-vars
import { getFeatureFlag } from '@/utils'
// local components
import { Stepper, StickyContainer, CertifyInformation } from '@/components/common'
import ButtonFooter from '@/components/common/ButtonFooter.vue'
import { RegistrationLengthTrustSummary } from '@/components/registration'
import { Collateral } from '@/components/collateral'
import { Parties } from '@/components/parties'
import FolioNumberSummary from '@/components/common/FolioNumberSummary.vue'

@Component({
  components: {
    ButtonFooter,
    Collateral,
    FolioNumberSummary,
    Parties,
    RegistrationLengthTrustSummary,
    Stepper,
    CertifyInformation,
    StickyContainer
  }
})
export default class ReviewConfirm extends Vue {
  @Getter getAddCollateral: AddCollateralIF
  @Getter getAddSecuredPartiesAndDebtors: AddPartiesIF
  @Getter getLengthTrust: LengthTrustIF
  @Getter getRegistrationFlowType: RegistrationFlowType
  @Getter getRegistrationOther: string
  @Getter getRegistrationType: RegistrationTypeIF
  @Getter hasUnsavedChanges: Boolean

  @Action setAddCollateral: ActionBindingIF
  @Action setLengthTrust: ActionBindingIF
  @Action setShowStepErrors: ActionBindingIF
  @Action setAddSecuredPartiesAndDebtors: ActionBindingIF
  @Action setUnsavedChanges: ActionBindingIF

  /** Whether App is ready. */
  @Prop({ default: false })
  private appReady: boolean

  @Prop({ default: false })
  private isJestRunning: boolean

  @Prop({ default: false })
  private saveDraftExit: boolean

  private dataLoaded = false
  private feeType = FeeSummaryTypes.NEW
  private showStepErrors: boolean = false
  private statementType = StatementTypes.FINANCING_STATEMENT
  private stepName = RouteNames.REVIEW_CONFIRM
  private validCertify = false
  private validFolio = true

  private get isAuthenticated (): boolean {
    return Boolean(sessionStorage.getItem(SessionStorageKeys.KeyCloakToken))
  }

  private get registrationLength (): RegistrationLengthI {
    return {
      lifeInfinite: this.getLengthTrust?.lifeInfinite || false,
      lifeYears: this.getLengthTrust?.lifeYears || 0
    }
  }

  private get registrationTypeUI (): string {
    if (this.getRegistrationType?.registrationTypeAPI === APIRegistrationTypes.OTHER) {
      return this.getRegistrationOther || ''
    }
    return this.getRegistrationType?.registrationTypeUI || ''
  }

  private get registrationType (): string {
    return this.getRegistrationType?.registrationTypeAPI || ''
  }

  mounted () {
    this.onAppReady(this.appReady)
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
    // redirect if store doesn't contain all needed data (happens on page reload, etc.)
    if (!this.getRegistrationType || this.getRegistrationFlowType !== RegistrationFlowType.NEW) {
      this.$router.push({
        name: RouteNames.DASHBOARD
      })
      return
    }
    const unsavedChanges = this.hasUnsavedChanges
    const collateral = this.getAddCollateral
    if (!collateral.valid) {
      collateral.showInvalid = true
      this.setAddCollateral(collateral)
    }
    const lengthTrust = this.getLengthTrust
    if (!lengthTrust.valid) {
      lengthTrust.showInvalid = true
      this.setLengthTrust(lengthTrust)
    }
    const parties = this.getAddSecuredPartiesAndDebtors
    if (!parties.valid) {
      parties.showInvalid = true
      this.setAddSecuredPartiesAndDebtors(parties)
    }
    // set unsavedChanges back to what it was
    this.setUnsavedChanges(unsavedChanges)
    // page is ready to view
    this.emitHaveData(true)
    this.dataLoaded = true
  }

  @Watch('registrationIncomplete')
  private registrationIncomplete (): void {
    this.showStepErrors = true
    this.setShowStepErrors(true)
  }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/theme.scss';
.step-container {
  margin-top: 1rem;
  padding: 1.25rem;
}
.meta-container {
  display: flex;
  flex-flow: column nowrap;
  position: relative;
  > label:first-child {
    font-weight: 700;
  }
}
@media (min-width: 768px) {
  .meta-container {
    flex-flow: row nowrap;
    > label:first-child {
      flex: 0 0 auto;
      padding-right: 2rem;
      width: 12rem;
    }
  }
}
@media print {
  body {
    overflow: auto;
    height: auto;
    -webkit-print-color-adjust: exact !important;   /* Chrome, Safari, Edge */
    color-adjust: exact !important;                 /*Firefox*/
  }
  ::v-deep .v-data-table__wrapper {
    overflow: visible;
    height: auto;
  }
  ::v-deep .col-9 {
    max-width: 100%;
  }
  .v-footer {
    display: none;
  }
  .right-page {
    width: 30%;
  }
  #step-buttons-container {
    display: none;
  }
  .vue-affix {
    position: relative;
    top: 0px !important;
  }
  table {
    table-layout: auto;
  }
  .px-15 {
    padding-left: 10px !important;
    padding-right: 10px !important;
  }
  ::v-deep .v-data-table > .v-data-table__wrapper > table > tbody > tr > td,
  ::v-deep .v-data-table > .v-data-table__wrapper > table > tbody > tr > th,
  ::v-deep .v-data-table > .v-data-table__wrapper > table > thead > tr > td,
  ::v-deep .v-data-table > .v-data-table__wrapper > table > thead > tr > th
  {
    padding: 0 8px;
  }
  #parties-summary {
    page-break-inside: avoid !important;
  }
}
.reg-default-btn {
  background-color: $gray3 !important;
}
.reg-default-btn::before {
  background-color: transparent !important;
}
</style>
