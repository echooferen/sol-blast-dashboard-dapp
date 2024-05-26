import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';
import HistoryTab from './history-tab';
import api from '@/service/api';

const BridgeModal = ({ closeModal }: { closeModal: any }) => {
  const [activeTab, setActiveTab] = useState('deposit');
  const [selectedCurrency, setSelectedCurrency] = useState('Ethereum-ETH');
  const [depsoitedAmount, setDepositedAmount] = useState<number>(0);

  const modalRef = useRef<HTMLDivElement>(null);

  const handleCurrencyChange = (e: any) => {
    setSelectedCurrency(e.target.value);
  };

  const handleChange = (e: any) => {
    setDepositedAmount(Number(e.target.value));
  };

  const handleConfirm = async () => {
    const response = await api
      .post(`/deposits/solana`, { amount: depsoitedAmount })
      .then((r) => r.data);
    console.log({ response });
  };

  useEffect(() => {
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

  return (
    <div className="fixed  inset-0 z-50  flex items-center justify-center bg-[#1a1906] bg-opacity-90 ">
      <div
        ref={modalRef}
        style={{
          clipPath: 'polygon(5% 0, 100% 0, 100% 100%, 0 100%, 0 5%)',
          //   // WebkitBoxShadow: '0px 0px 28px 2px rgba(235, 230, 136, 0.9)',
          //   // MozBoxShadow: '0px 0px 28px 2px rgba(235, 230, 136, 0.9)',
          //   // boxShadow: '0px 0px 28px 2px rgba(235, 230, 136, 0.9)',
        }}
        className=" bg-[#201F07] ">
        <div className=" shadow-whiteyellow drop-shadow-xl ">
          <div className="mb-5  flex w-full justify-between">
            <button
              className={`w-full px-6 py-5 ${activeTab === 'deposit' ? 'bg-black' : ''}`}
              onClick={() => setActiveTab('deposit')}>
              Deposit
            </button>
            <button
              className={`w-full px-6 py-5 ${activeTab === 'history' ? 'bg-black' : ' text-[#FFFDBF99]'}`}
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
                className="mb-4 block w-full  rounded border border-whiteyellow bg-[#363407] p-3 py-5 text-[15px] text-neutral-100"
                value={selectedCurrency}
                onChange={handleCurrencyChange}>
                <option value="Ethereum-ETH">Ethereum (ETH)</option>
                <option value="Ethereum-USDC">Ethereum (USDC)</option>
                <option value="Solana">Solana</option>
                {/* Add other currencies here */}
              </select>

              <div className="mb-4  flex items-center justify-between rounded border border-whiteyellow bg-[#363407] p-3 text-[15px]">
                <input
                  className="w-[200px] rounded border-r bg-transparent p-1 text-center text-[48px]"
                  placeholder="0.0"
                  onChange={handleChange}
                />
                <div className="h-full w-full items-center gap-1  pl-2">
                  <span className="pl-3 pr-5 text-[24px] text-white">
                    1{' '}
                    {selectedCurrency === 'Ethereum-ETH'
                      ? 'ETH'
                      : selectedCurrency === 'Ethereum-USDC'
                        ? 'USDC'
                        : 'SOL'}
                  </span>
                  <span className="text-[18px] text-neutral-600">
                    {selectedCurrency === 'Ethereum-ETH'
                      ? '3,016.72'
                      : selectedCurrency === 'Ethereum-USDC'
                        ? '1.01'
                        : '125.34'}{' '}
                    USD
                  </span>
                </div>
              </div>

              <Image
                src={'./bridge-modal-lines.svg'}
                width={530}
                height={44}
                alt="Bridge-Modal-Lines"
              />
              <select
                id="currency-send-select"
                className="my-4  block w-full rounded border border-whiteyellow bg-[#363407] p-3 py-5 text-[15px] text-white"
                value={selectedCurrency}
                onChange={handleCurrencyChange}>
                <option value="Layer2">Layer2</option>
              </select>
              <div className="mb-4 text-center text-[12px] text-whiteyellow">
                You will receive N Points
              </div>
              <button
                className="mx-auto flex w-full items-center justify-center"
                onClick={handleConfirm}>
                <Image
                  src={'/confirm-deposit.svg'}
                  alt=""
                  width={510}
                  height={64}
                />
              </button>
            </div>
          )}
          {activeTab === 'history' && <HistoryTab />}
        </div>
      </div>
    </div>
  );
};

export default BridgeModal;
