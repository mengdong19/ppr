<template>
  <div id="transfer-confirm">
    <h2>2. Confirm</h2>
    <p class="mt-2">
      The following information must be completed and confirmed before submitting this registration.
    </p>
    <v-card
      flat
      rounded
      id="confirm-completion-card"
      class="mt-8 pt-5 pa-8 pr-6 pb-3"
      :class="{ 'border-error-left': showErrorComponent }"
      data-test-id="confirm-completion-card"
    >
      <v-form ref="confirmCompletionForm">
        <v-row>
          <v-col cols="3">
            <label class="generic-label" for="declared-value" :class="{ 'error-text': showErrorComponent }">
              Confirm Completion
            </label>
          </v-col>
          <v-col cols="9" class="confirm-completion-req">
            <ol>
              <li class="pl-3 pb-3 mb-7">
                <p><strong>Bill of sale</strong> has been signed by either all owners or by someone with the authority
                  to act on behalf of the registered owners.</p>
                <p class="confirm-completion-note">
                  <span>Note: </span> If the bill of sale has been signed by someone acting on behalf of the registered
                  owners, the person submitting this transfer is a lawyer or notary, and the power by which the
                  signatory was authorized was power of attorney, representation agreement, committee, receiver, or writ
                  of seizure and sale.
                </p>
              </li>
              <li class="pl-3 pb-3 mb-7">
                <p><strong>Search of the Corporate Register</strong> has been completed if one or more of the current or
                future owners is an incorporated company, society or cooperative association.</p>
                <p class="confirm-completion-note">
                  <span>Note: </span> For current registered owners the incorporated business must have been active on
                  the Corporate Register at the time the bill of sale was signed. Future owners must be in active status
                  at the time of registration.
                </p>
              </li>
              <li class="pl-3 pb-3 mb-0">
                <p><strong>Personal Property Registry lien search</strong> has been completed and there are no liens
                on the home that stop the transfer.</p>
                <p class="confirm-completion-note">
                  <span>Note: </span> Liens that stop the transfer include Family Maintenance Enforcement Act, Family
                  Relations Act, BC Second Mortgage, Land Tax Deferment Act.
                </p>
              </li>
            </ol>
            <v-checkbox
              class="pa-7 ma-0 confirm-checkbox"
              :hide-details="true"
              id="checkbox-certified"
              v-model="confirmCompletion"
              data-test-id="confirm-completion-checkbox"
            >
              <template v-slot:label data-test-id="confirm-checkbox-label">
                <span :class="{ 'invalid-color': showErrorComponent }">
                  I, <strong>{{ legalName }}</strong
                  >, confirm that all of the requirements listed above have been completed.
                </span>
              </template>
            </v-checkbox>
          </v-col>
        </v-row>
      </v-form>
    </v-card>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, reactive, toRefs, watch } from '@vue/composition-api'

export default defineComponent({
  name: 'ConfirmCompletion',

  props: {
    legalName: {
      type: String,
      required: true
    },
    setShowErrors: {
      type: Boolean,
      default: false
    }
  },
  emits: ['confirmCompletion'],
  setup (props, { emit }) {
    const localState = reactive({
      showErrorComponent: computed((): boolean => {
        return (props.setShowErrors && !localState.confirmCompletion)
      }),
      confirmCompletion: false
    })

    watch(
      () => localState.confirmCompletion,
      (val: boolean) => {
        emit('confirmCompletion', val)
      }
    )

    return {
      ...toRefs(localState)
    }
  }
})
</script>

<style lang="scss" scoped>
@import '@/assets/styles/theme.scss';
#transfer-confirm {
  p {
    color: $gray7;
  }
  .confirm-completion-req {
    ol {
      padding-left: 50px;
    }
    ol li:not(:last-child) {
      border-bottom: 1px solid $gray3;
      ::marker {
        font-weight: bold;
      }
    }
  }
  .confirm-completion-note {
    margin-top: 20px;
    font-size: 14px;
    line-height: 22px;
    color: $gray7;
    span {
      font-weight: bold;
    }
  }

  .confirm-checkbox::v-deep {
    background-color: $gray1;
    font-size: 16px;
    line-height: 24px;
    vertical-align: top;

    .v-input__control .v-input__slot {
      align-items: flex-start;
    }
  }
}
</style>
