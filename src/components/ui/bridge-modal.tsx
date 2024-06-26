import Image from 'next/image';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import {
  useAccount as useEtherAccount,
  useSendTransaction,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { useWeb3Modal as useEtherWalletModal } from '@web3modal/wagmi/react';
import { toast } from 'react-toastify';

import HistoryTab from './history-tab';
import api from '@/service/api';
import { Transaction } from '@solana/web3.js';
import { useApp } from '@/context';
import { useOnceEffect } from '@/hook/useOnceEffect';
import { IDepositTx } from '@/config/types';
import { ERC20_ABI } from '@/config/abi';
import { USDC_ADDRESS } from '@/config/const';

const BridgeModal = ({ closeModal }: { closeModal: any }) => {
  const {
    setIsBridgeModalOpen,
    user,
    userId,
    handleMsgSign,
    handleGetUserProfile,
    setTxLoading,
  } = useApp();
  const { publicKey: solanaAddress } = useWallet();
  const { setVisible } = useWalletModal();
  const { address: etherAddress } = useEtherAccount();
  const { open } = useEtherWalletModal();
  const { signTransaction } = useWallet();
  const { connection } = useConnection();
  const { writeContractAsync } = useWriteContract();
  const { data: hash, sendTransaction: sendEthTransaction } =
    useSendTransaction();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  const [activeTab, setActiveTab] = useState('deposit');
  const [selectedCurrency, setSelectedCurrency] = useState('Eth');
  const [depositedAmount, setDepositedAmount] = useState<number>(0);
  const [pointAmount, setPointAmount] = useState<number>(0);
  const [txes, setTxes] = useState<IDepositTx[]>([]);

  const modalRef = useRef<HTMLDivElement>(null);

  const isSolSelectedAndNoSolAddress = useMemo(() => {
    return (
      (selectedCurrency === 'Sol' || selectedCurrency === 'Susdc') &&
      !user.solana_address
    );
  }, [selectedCurrency, user]);

  const isEthOrUsdcSelectedAndNoEthAddress = useMemo(() => {
    return (
      (selectedCurrency === 'Eth' || selectedCurrency === 'Usdc') &&
      !user.ethereum_address
    );
  }, [selectedCurrency, user]);

  const handleCurrencyChange = (e: any) => {
    setSelectedCurrency(e.target.value);
  };

  const handleChange = (e: any) => {
    setDepositedAmount(Number(e.target.value));
  };

  const handleSetAssociateAddress = async () => {
    try {
      setTxLoading(true);
      if (user.ethereum_address && !solanaAddress) setVisible(true);
      else if (user.solana_address && !etherAddress) open();

      if (user.ethereum_address && user.solana_address) {
        return;
      } else {
        if (user.ethereum_address) {
          const msg = await handleMsgSign('Sol');
          const res = await api.post(`/users/${userId}/associate-address`, {
            public_address: solanaAddress,
            signed_message: msg,
            signed_on: 'Sol',
          });

          if (res.status === 200) {
            toast.success('Address association completed successfully');
          } else if (res.status === 400) {
            toast.error(
              'Attempted to associate an address that is already associated to another account',
            );
          }
          handleGetUserProfile();
        } else if (user.solana_address && etherAddress) {
          const msg = await handleMsgSign('Eth');
          const res = await api.post(`/users/${userId}/associate-address`, {
            public_address: etherAddress,
            signed_message: msg,
            signed_on: 'Eth',
          });

          if (res.status === 200) {
            toast.success('Address association completed successfully');
          } else if (res.status === 400) {
            toast.error(
              'Attempted to associate an address that is already associated to another account',
            );
          }
          handleGetUserProfile();
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err);
    } finally {
      setTxLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (selectedCurrency === 'Sol' && !solanaAddress) setVisible(true);
    else if (selectedCurrency !== 'Sol' && !etherAddress) open();

    try {
      setTxLoading(true);
      if (depositedAmount <= 0) {
        return toast.error(`You must set the amount to deposit`);
      }
      if (selectedCurrency === 'Sol' || selectedCurrency === 'Susdc') {
        const encodedTx = await api
          .post(`/deposits/solana`, {
            amount: depositedAmount,
            coin: selectedCurrency,
          })
          .then((r) => r.data);
        console.log({ encodedTx });
        const transaction = Transaction.from(new Buffer(encodedTx, 'base64'));
        console.log(transaction, '=====>');
        console.log(await connection.simulateTransaction(transaction));

        if (signTransaction) {
          console.log(' ===> ');
          const sTx = await signTransaction(transaction!);

          const rawTx = await connection.sendRawTransaction(sTx.serialize());
          console.log(`https://explorer.solana.com/tx/${rawTx}`);

          setIsBridgeModalOpen(false);

          toast.success(
            <Msg
              title="Deposit Successful"
              desc="Refresh after 5 minutes to see updated amounts"
            />,
          );
        }
      } else {
        const encodedTx = await api
          .post(`/deposits/ethereum`, {
            amount: depositedAmount,
            coin: selectedCurrency,
          })
          .then((r) => r.data);
        console.log({ encodedTx });

        if (selectedCurrency === 'Usdc') {
          await writeContractAsync({
            abi: ERC20_ABI,
            address: USDC_ADDRESS,
            functionName: 'approve',
            args: [encodedTx.to, BigInt((depositedAmount + 10) * 10 ** 6)],
          });
        }

        sendEthTransaction({
          to: encodedTx.to,
          value: encodedTx.value,
          data: encodedTx.data,
        });
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e);
    } finally {
      // setLoading(false);
      setTxLoading(false);
    }
  };

  const handleFetchPoint = useCallback(async () => {
    const amount = await api
      .get(`/deposits/quote`, {
        params: {
          coin: selectedCurrency,
          amount: depositedAmount,
        },
      })
      .then((r) => r.data);

    setPointAmount(amount);
  }, [selectedCurrency, depositedAmount]);

  const handleFetchTxs = useCallback(async () => {
    const newTxes = await api
      .get(`/users/${userId}/deposits`, {
        params: {
          limit: 20,
          page: 1,
        },
      })
      .then((r) => r.data);

    console.log(newTxes);
    setTxes(newTxes.records);
  }, [selectedCurrency, depositedAmount]);

  useOnceEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        closeModal();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [closeModal]);

  useOnceEffect(() => {
    handleFetchPoint();
  }, [selectedCurrency, depositedAmount]);

  useOnceEffect(() => {
    handleFetchTxs();
  }, []);

  useOnceEffect(() => {
    if (isConfirmed) {
      console.log({ hash });
      toast.success(
        <Msg
          title="Deposit Successful"
          desc="Refresh after 5 minutes to see updated amounts"
        />,
      );
      setIsBridgeModalOpen(false);
    }
  }, [isConfirmed]);

  const Msg = ({ title, desc }: { title: string; desc: string }) => (
    <div>
      <h2 className="text-green-700"> {title}</h2>
      <p className="text-[12px]"> {desc} </p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a190681] backdrop-blur-[5px]">
      <div className="drop-shadow-[0_0_2px_#F8EF00]">
        <div
          ref={modalRef}
          style={{
            clipPath: 'polygon(5% 0, 100% 0, 100% 100%, 0 100%, 0 5%)',
          }}
          className="bg-[#201F07]">
          <div className=" shadow-whiteyellow drop-shadow-xl max-md:max-w-[400px] max-sm:max-w-[300px]">
            <div className="mb-5 flex w-full justify-between">
              <button
                className={`w-full px-6 py-5 ${activeTab === 'deposit' ? 'bg-[#f8f000d0]' : ''}`}
                onClick={() => setActiveTab('deposit')}>
                Deposit
              </button>
              <button
                className={`w-full px-6 py-5 ${activeTab === 'history' ? 'bg-[#f8f000d0]' : ' text-[#FFFDBF99]'}`}
                onClick={() => setActiveTab('history')}>
                History
              </button>
            </div>
            {activeTab === 'deposit' && (
              <div className="deposit-body p-4">
                <label
                  htmlFor="currency-select"
                  className="mb-2 block text-[15px] text-whiteyellow">
                  Deposit From
                </label>
                <select
                  id="currency-select"
                  className="mb-4 block w-full rounded border border-whiteyellow bg-[#363407] p-3 py-5 text-[15px] text-neutral-100"
                  value={selectedCurrency}
                  onChange={handleCurrencyChange}>
                  <option value="Eth">Ethereum (ETH)</option>
                  <option value="Usdc">Ethereum (USDC)</option>
                  <option value="Sol">Solana</option>
                  <option value="Susdc">SOL (USDC)</option>
                  {/* Add other currencies here */}
                </select>

                <div className="mb-4  flex items-center justify-between rounded border border-whiteyellow bg-[#363407] p-3 text-[15px]">
                  <input
                    className="w-[200px] rounded border-r bg-transparent p-1 text-center text-[48px] max-md:w-[140px] max-sm:w-[100px] max-sm:text-base"
                    placeholder="0.0"
                    onChange={handleChange}
                  />
                  <div className="h-full w-full items-center gap-1  pl-2">
                    <span className="pl-3 pr-5 text-[24px] text-white max-sm:text-base">
                      {selectedCurrency === 'Eth'
                        ? 'ETH'
                        : selectedCurrency === 'Usdc'
                          ? 'USDC'
                          : selectedCurrency === 'Sol'
                            ? 'SOL'
                            : 'SOL USDC'}
                    </span>
                  </div>
                </div>

                <Image
                  src={'./bridge-modal-lines.svg'}
                  width={530}
                  height={44}
                  alt="Bridge-Modal-Lines"
                />
                <div className="my-4 block w-full rounded border border-whiteyellow bg-[#363407] p-3 py-5 text-[15px] text-white">
                  Layer2
                </div>
                <div className="mb-4 text-center text-[12px] text-whiteyellow">
                  You will receive {pointAmount} Points
                </div>
                <button
                  className="mx-auto flex w-full items-center justify-center active:opacity-60"
                  onClick={
                    isSolSelectedAndNoSolAddress ||
                    isEthOrUsdcSelectedAndNoEthAddress
                      ? handleSetAssociateAddress
                      : handleConfirm
                  }>
                  <Image
                    src={
                      isSolSelectedAndNoSolAddress ||
                      isEthOrUsdcSelectedAndNoEthAddress
                        ? '/CONNECT_WALLET.svg'
                        : '/confirm-deposit.svg'
                    }
                    alt="deposit"
                    width={510}
                    height={64}
                  />
                </button>
              </div>
            )}
            {activeTab === 'history' && <HistoryTab data={txes} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BridgeModal;
