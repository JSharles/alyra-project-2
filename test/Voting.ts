import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";
import { expect } from "chai";

enum WorkflowStatus {
  RegisteringVoters,
  ProposalsRegistrationStarted,
  ProposalsRegistrationEnded,
  VotingSessionStarted,
  VotingSessionEnded,
  VotesTallied,
}

async function setWorkflowStatus(voting: any, status: WorkflowStatus) {
  switch (status) {
    case WorkflowStatus.ProposalsRegistrationStarted:
      await voting.startProposalsRegistering();
      break;
    case WorkflowStatus.ProposalsRegistrationEnded:
      await voting.endProposalsRegistering();
      break;
    case WorkflowStatus.VotingSessionStarted:
      await voting.startVotingSession();
      break;
    case WorkflowStatus.VotingSessionEnded:
      await voting.endVotingSession();
      break;
    case WorkflowStatus.VotesTallied:
      await voting.tallyVotes();
      break;
    default:
      break;
  }
}

describe("Voting", () => {
  async function deployVotingFixture() {
    const [owner, accountA, accountB] = await ethers.getSigners();
    const Voting = await ethers.getContractFactory("Voting");
    const voting = await Voting.deploy();
    return { voting, owner, accountA, accountB };
  }

  describe("on deploy", () => {
    it("should set the contract owner", async () => {
      const { voting, owner } = await loadFixture(deployVotingFixture);
      expect(await voting.owner()).to.equal(owner.address);
    });
  });

  describe("on vote status change", () => {
    const keys = Object.keys(WorkflowStatus).filter((v) => isNaN(Number(v)));
    let voting: any;
    let prev: number;
    let next: number;
    let tx: any;

    beforeEach(async () => {
      ({ voting } = await loadFixture(deployVotingFixture));
    });

    for (const [index, key] of keys.entries()) {
      describe(`when status changes to ${key}`, () => {
        beforeEach(async () => {
          prev = index - 1;
          next = index;

          if (key === "RegisteringVoters") {
            tx = null;
            return;
          }

          if (key === "ProposalsRegistrationStarted") {
            tx = await voting.startProposalsRegistering();
          } else if (key === "ProposalsRegistrationEnded") {
            await voting.startProposalsRegistering();
            tx = await voting.endProposalsRegistering();
          } else if (key === "VotingSessionStarted") {
            await voting.startProposalsRegistering();
            await voting.endProposalsRegistering();
            tx = await voting.startVotingSession();
          } else if (key === "VotingSessionEnded") {
            await voting.startProposalsRegistering();
            await voting.endProposalsRegistering();
            await voting.startVotingSession();
            tx = await voting.endVotingSession();
          } else if (key === "VotesTallied") {
            await voting.startProposalsRegistering();
            await voting.endProposalsRegistering();
            await voting.startVotingSession();
            await voting.endVotingSession();
            tx = await voting.tallyVotes();
          }
        });

        it(`should set the vote status to ${key}`, async () => {
          const status = await voting.workflowStatus();
          expect(status).to.equal(next);
        });

        it("should emit an event", async () => {
          if (key === "RegisteringVoters") {
            return;
          }
          await expect(tx)
            .to.emit(voting, "WorkflowStatusChange")
            .withArgs(prev, next);
        });
      });
    }
  });

  describe("addVoter", () => {
    let voting: any;
    let owner: any;
    let accountA: any;
    let accountB: any;

    beforeEach(async () => {
      ({ voting, owner, accountA, accountB } = await loadFixture(
        deployVotingFixture
      ));
      await setWorkflowStatus(voting, WorkflowStatus.RegisteringVoters);
    });

    it("should emit an event when a voter is added", async () => {
      expect(await voting.addVoter(accountB.address))
        .to.emit(voting, "VoterRegistered")
        .withArgs(accountB.address);
    });

    it("should have the status set to ProposalsRegistrationStarted", async () => {
      const status = await voting.workflowStatus();
      expect(status).to.equal(WorkflowStatus.RegisteringVoters);
    });

    it("should enable to add voter when status is ProposalsRegistrationStarted", async () => {
      await voting.addVoter(accountA.address);
      const voter = await voting.connect(accountA).getVoter(accountA.address);
      expect(voter.isRegistered).to.be.true;
    });

    it("should revert if the sender is not the owner", async () => {
      await expect(
        voting.connect(accountA).addVoter(accountB)
      ).to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount");
    });

    it("should revert if voter is already registered", async () => {
      await voting.addVoter(accountA);
      await expect(voting.addVoter(accountA)).to.rejectedWith(
        "Already registered"
      );
    });

    it("should not to be able to add new voter when status is not ProposalsRegistrationStarted", async () => {
      const keys = Object.keys(WorkflowStatus).filter((v) => isNaN(Number(v)));
      keys.forEach(async (key, index) => {
        if (key !== "RegisteringVoters") {
          if (key === "ProposalsRegistrationStarted") {
            setWorkflowStatus(
              voting,
              WorkflowStatus.ProposalsRegistrationStarted
            );
            expect(await voting.addVoter(accountA.address)).to.revertedWith(
              "Voters registration is not open yet"
            );
          }
          if (key === "ProposalsRegistrationEnded") {
            setWorkflowStatus(
              voting,
              WorkflowStatus.ProposalsRegistrationEnded
            );
            expect(await voting.addVoter(accountA.address)).to.revertedWith(
              "Voters registration is not open yet"
            );
          }
          if (key === "VotingSessionStarted") {
            setWorkflowStatus(voting, WorkflowStatus.VotingSessionStarted);
            expect(await voting.addVoter(accountA.address)).to.revertedWith(
              "Voters registration is not open yet"
            );
          }
          if (key === "VotingSessionEnded") {
            setWorkflowStatus(voting, WorkflowStatus.VotingSessionEnded);
            expect(await voting.addVoter(accountA.address)).to.revertedWith(
              "Voters registration is not open yet"
            );
          }
          if (key === "VotesTallied") {
            setWorkflowStatus(voting, WorkflowStatus.VotesTallied);
            expect(await voting.addVoter(accountA.address)).to.revertedWith(
              "Voters registration is not open yet"
            );
          }
        }
      });
    });
  });
  describe("getVoter", () => {});
  describe("getOneProposal", () => {});
  describe("addProposal", () => {});
  describe("setVote", () => {});
  describe("tallyVotes", () => {});
});
