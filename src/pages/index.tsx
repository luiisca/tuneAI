function RedirectPage() {
  return;
}

export async function getServerSideProps() {
  return {
    redirect: {
      permanent: false,
      destination: "/discover",
    },
  };
}

export default RedirectPage;
