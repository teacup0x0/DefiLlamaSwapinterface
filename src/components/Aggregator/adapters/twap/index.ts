import { ethers } from 'ethers';
import { providers } from '../../rpcs';
import { ABI } from './abi';
import { BigNumber } from 'ethers';

// https://about.airswap.io/technology/protocols

// registry addresses
export const chainToId = {
	ethereum: '0xd17b3c9784510E33cD5B87b490E79253BcD81e2E',
	arbitrum: '0x973bf562407766e77f885c1cd1a8060e5303C745'
};

const SUBMIT_DEADLINE = 30 * 60

export async function getQuote(
	chain: string,
	from: string,
	to: string,
	amount: string,
	{ amountOut, slippage }
) {
	const proxyContract = new ethers.Contract(chainToId[chain], ABI, providers[chain]);
	let quotes = amount
	let amountIn = amount
	let side = 'buy'
	if(amountOut && amountOut !== '0'){
		quotes = await proxyContract.quoteBuy(from, to, amountOut)
		amountOut = quotes
	} else {
		quotes = await proxyContract.quoteSell(from, to, amount)
		amountIn = quotes
		side = 'sell'
		
	}
	const gas = await proxyContract.ethTransferGasCost();
	return {
		amountReturned: quotes,
		estimatedGas: gas,
		tokenApprovalAddress: chainToId[chain],
		rawQuote: { 
			side,
			amountIn,
			amountOut,
			slippage,
		 },
		logo: 'https://assets.coingecko.com/markets/images/1022/small/integral_size.jpeg?1672994513'
	};
}

export async function swap({ chain, from, to, signer, rawQuote }) {
	const fromAddress = await signer.getAddress();
	const proxyContract = new ethers.Contract(chainToId[chain], ABI, providers[chain]);

	if(rawQuote.side && rawQuote.side == 'buy' ){
		const amountInMax = BigNumber.from(rawQuote.amountIn)
		.mul(1 + Number(rawQuote.slippage) / 100)
		.toString();
		return proxyContract.buy(
			from,
			to,
			amountInMax,
			rawQuote.amountOut,
			false,
			fromAddress,
			Date.now() / 1000 + SUBMIT_DEADLINE
		)
	}else{
		const amountOutMin = BigNumber.from(rawQuote.amountOut)
		.mul(1 - Number(rawQuote.slippage) / 100)
		.toString();
		return proxyContract.buy(
			from,
			to,
			rawQuote.amountIn,
			amountOutMin,
			false,
			fromAddress,
			Date.now() / 1000 + SUBMIT_DEADLINE
		)
	}

	
}

