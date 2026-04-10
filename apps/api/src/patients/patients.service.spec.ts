import { PatientsService } from "./patients.service";

describe("PatientsService", () => {
  const prisma = {
    patient: {
      findMany: jest.fn(),
      count: jest.fn()
    },
    $transaction: jest.fn()
  } as any;

  const auditService = {
    log: jest.fn()
  };

  let service: PatientsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PatientsService(prisma, auditService as any);
  });

  it("returns paginated search results", async () => {
    prisma.$transaction.mockResolvedValueOnce([
      [
        {
          id: "p1",
          ficheNumber: "F-1",
          firstName: "Ali",
          lastName: "Ben",
          phone: "+216"
        }
      ],
      1
    ]);

    const result = await service.search("tenant-1", {
      page: 1,
      pageSize: 10,
      search: "Ali"
    } as any);

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
  });
});
