import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";
import { BuEscrow } from "../target/types/bu_escrow";

describe("bu-escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.BuEscrow as Program<BuEscrow>;
  const connection = provider.connection;
  const wallet = provider.wallet as anchor.Wallet;

  // Test participants
  let payerKeypair: Keypair;
  let payeeKeypair: Keypair;
  let executorKeypair: Keypair;
  let protocolFeeRecipient: Keypair;

  // Token state
  let usdcMint: PublicKey;
  let payerTokenAccount: PublicKey;
  let payeeTokenAccount: PublicKey;

  // Escrow state
  const agreementId = new Uint8Array(32);
  agreementId[0] = 1; // Simple test ID

  let escrowPda: PublicKey;
  let vaultPda: PublicKey;

  const USDC_DECIMALS = 6;
  const MILESTONE_1_AMOUNT = 1_000_000_000; // 1000 USDC
  const MILESTONE_2_AMOUNT = 500_000_000; // 500 USDC

  before(async () => {
    // Generate test keypairs
    payerKeypair = Keypair.generate();
    payeeKeypair = Keypair.generate();
    executorKeypair = Keypair.generate();
    protocolFeeRecipient = Keypair.generate();

    // Airdrop SOL to participants
    for (const kp of [payerKeypair, executorKeypair]) {
      const sig = await connection.requestAirdrop(
        kp.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(sig);
    }

    // Create USDC mint (test stablecoin)
    usdcMint = await createMint(
      connection,
      wallet.payer,
      wallet.publicKey, // mint authority
      null,
      USDC_DECIMALS
    );

    // Create token accounts for payer and payee
    const payerAta = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.payer,
      usdcMint,
      payerKeypair.publicKey
    );
    payerTokenAccount = payerAta.address;

    const payeeAta = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.payer,
      usdcMint,
      payeeKeypair.publicKey
    );
    payeeTokenAccount = payeeAta.address;

    // Mint test USDC to payer
    await mintTo(
      connection,
      wallet.payer,
      usdcMint,
      payerTokenAccount,
      wallet.publicKey,
      5_000_000_000 // 5000 USDC
    );

    // Derive PDAs
    [escrowPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), Buffer.from(agreementId)],
      program.programId
    );

    [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from(agreementId)],
      program.programId
    );
  });

  it("Creates an escrow agreement", async () => {
    const milestoneAmounts = [
      new anchor.BN(MILESTONE_1_AMOUNT),
      new anchor.BN(MILESTONE_2_AMOUNT),
    ];

    await program.methods
      .createAgreement(
        Array.from(agreementId),
        milestoneAmounts,
        50, // 0.5% protocol fee
        2592000, // 30 days dispute window
        604800 // 7 days appeal window
      )
      .accounts({
        authority: wallet.publicKey,
        escrow: escrowPda,
        vault: vaultPda,
        tokenMint: usdcMint,
        payerParty: payerKeypair.publicKey,
        payeeParty: payeeKeypair.publicKey,
        executor: executorKeypair.publicKey,
        protocolFeeRecipient: protocolFeeRecipient.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    // Verify escrow state
    const escrow = await program.account.escrow.fetch(escrowPda);
    assert.equal(escrow.milestoneCount, 2);
    assert.equal(
      escrow.payer.toBase58(),
      payerKeypair.publicKey.toBase58()
    );
    assert.equal(
      escrow.payee.toBase58(),
      payeeKeypair.publicKey.toBase58()
    );
    assert.equal(
      escrow.executor.toBase58(),
      executorKeypair.publicKey.toBase58()
    );
    assert.equal(escrow.protocolFeeBps, 50);
    assert.equal(
      escrow.milestones[0].amount.toNumber(),
      MILESTONE_1_AMOUNT
    );
    assert.equal(
      escrow.milestones[1].amount.toNumber(),
      MILESTONE_2_AMOUNT
    );
    assert.deepEqual(escrow.milestones[0].status, { pending: {} });
  });

  it("Funds milestone 0", async () => {
    await program.methods
      .fundMilestone(0)
      .accounts({
        payerAuthority: payerKeypair.publicKey,
        escrow: escrowPda,
        payerTokenAccount,
        vault: vaultPda,
        tokenMint: usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([payerKeypair])
      .rpc();

    const escrow = await program.account.escrow.fetch(escrowPda);
    assert.isTrue(escrow.milestones[0].funded);
    assert.deepEqual(escrow.milestones[0].status, { funded: {} });
  });

  it("Executor sets milestone status to SUBMITTED", async () => {
    await program.methods
      .setMilestoneStatus(0, { submitted: {} })
      .accounts({
        executor: executorKeypair.publicKey,
        escrow: escrowPda,
      })
      .signers([executorKeypair])
      .rpc();

    const escrow = await program.account.escrow.fetch(escrowPda);
    assert.deepEqual(escrow.milestones[0].status, { submitted: {} });
  });

  it("Executor sets milestone status to APPROVED (opens dispute window)", async () => {
    await program.methods
      .setMilestoneStatus(0, { approved: {} })
      .accounts({
        executor: executorKeypair.publicKey,
        escrow: escrowPda,
      })
      .signers([executorKeypair])
      .rpc();

    const escrow = await program.account.escrow.fetch(escrowPda);
    assert.deepEqual(escrow.milestones[0].status, { approved: {} });
    assert.isAbove(escrow.milestones[0].disputeWindowEnd.toNumber(), 0);
  });

  it("Executor sets decision (100% to payee, no extras)", async () => {
    const receiptHash = new Uint8Array(32);
    receiptHash[0] = 0xab;
    receiptHash[1] = 0xcd;

    await program.methods
      .setDecision(0, 10000, [], Array.from(receiptHash))
      .accounts({
        executor: executorKeypair.publicKey,
        escrow: escrowPda,
      })
      .signers([executorKeypair])
      .rpc();

    const escrow = await program.account.escrow.fetch(escrowPda);
    assert.isTrue(escrow.decisions[0].isSet);
    assert.equal(escrow.decisions[0].payeeBps, 10000);
  });

  it("Executor executes decision — payee receives 100%", async () => {
    await program.methods
      .executeDecision(0)
      .accounts({
        executor: executorKeypair.publicKey,
        escrow: escrowPda,
        vault: vaultPda,
        tokenMint: usdcMint,
        payeeTokenAccount,
        payerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([executorKeypair])
      .rpc();

    const escrow = await program.account.escrow.fetch(escrowPda);
    assert.deepEqual(escrow.milestones[0].status, { released: {} });
    assert.equal(
      escrow.milestones[0].released.toNumber(),
      MILESTONE_1_AMOUNT
    );

    // Verify payee received funds
    const payeeBalance = await connection.getTokenAccountBalance(
      payeeTokenAccount
    );
    assert.equal(
      Number(payeeBalance.value.amount),
      MILESTONE_1_AMOUNT
    );
  });

  it("Rejects duplicate funding", async () => {
    try {
      await program.methods
        .fundMilestone(0)
        .accounts({
          payerAuthority: payerKeypair.publicKey,
          escrow: escrowPda,
          payerTokenAccount,
          vault: vaultPda,
          tokenMint: usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([payerKeypair])
        .rpc();
      assert.fail("Should have thrown");
    } catch (err: any) {
      assert.include(err.toString(), "AlreadyFunded");
    }
  });

  it("Rejects non-executor calling lock", async () => {
    // Fund milestone 1 first
    await program.methods
      .fundMilestone(1)
      .accounts({
        payerAuthority: payerKeypair.publicKey,
        escrow: escrowPda,
        payerTokenAccount,
        vault: vaultPda,
        tokenMint: usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([payerKeypair])
      .rpc();

    const fakeExecutor = Keypair.generate();
    try {
      await program.methods
        .lockMilestone(1, Array.from(new Uint8Array(32)))
        .accounts({
          executor: fakeExecutor.publicKey,
          escrow: escrowPda,
        })
        .signers([fakeExecutor])
        .rpc();
      assert.fail("Should have thrown");
    } catch (err: any) {
      assert.include(err.toString(), "OnlyExecutor");
    }
  });

  it("Locks milestone 1 for dispute", async () => {
    const disputeHash = new Uint8Array(32);
    disputeHash[0] = 0xff;

    await program.methods
      .lockMilestone(1, Array.from(disputeHash))
      .accounts({
        executor: executorKeypair.publicKey,
        escrow: escrowPda,
      })
      .signers([executorKeypair])
      .rpc();

    const escrow = await program.account.escrow.fetch(escrowPda);
    assert.isTrue(escrow.milestones[1].locked);
    assert.deepEqual(escrow.milestones[1].status, { disputed: {} });
  });

  it("Executes 70/30 split decision on disputed milestone", async () => {
    const receiptHash = new Uint8Array(32);
    receiptHash[0] = 0xde;
    receiptHash[1] = 0xad;

    // Set decision: 70% to payee, 30% to payer
    await program.methods
      .setDecision(1, 7000, [], Array.from(receiptHash))
      .accounts({
        executor: executorKeypair.publicKey,
        escrow: escrowPda,
      })
      .signers([executorKeypair])
      .rpc();

    // Execute
    await program.methods
      .executeDecision(1)
      .accounts({
        executor: executorKeypair.publicKey,
        escrow: escrowPda,
        vault: vaultPda,
        tokenMint: usdcMint,
        payeeTokenAccount,
        payerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([executorKeypair])
      .rpc();

    const escrow = await program.account.escrow.fetch(escrowPda);
    assert.deepEqual(escrow.milestones[1].status, { released: {} });

    // Payee should have: 1000 USDC (milestone 0) + 350 USDC (70% of 500) = 1350 USDC
    const payeeBalance = await connection.getTokenAccountBalance(
      payeeTokenAccount
    );
    assert.equal(
      Number(payeeBalance.value.amount),
      MILESTONE_1_AMOUNT + (MILESTONE_2_AMOUNT * 7000) / 10000
    );
  });
});
