import { createAction } from '@reduxjs/toolkit';
import { Wallet } from '../wallets/reducer';

export const applicationInit = createAction<{
  web3Endpoint: string
}>("application/init");

export const applicationBlockchainUpdateBlockNumber = createAction<number>
  ("application/blockchainUpdateBlockNumber")

export const applicationDataUpdate = createAction<{
  resource: string,
  data: string,
  keystores: string,
  database: string
}>
  ("Application_Update_SysInfo")

export const applicationActionConfirmedMnemonic = createAction<{
  mnemonic: string
}>("application/actionConfirmedMnemonic");


export const applicationActionUpdateAtCreateWallet = createAction<boolean>(
  "application/actionUpdateAtCreateWallet"
)
